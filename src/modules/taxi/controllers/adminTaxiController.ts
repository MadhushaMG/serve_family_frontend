import { Response } from "express";
import { AuthRequest } from "../../../middleware/auth";
import { db } from "../../../db";
import { Op } from "sequelize";
import bcrypt from "bcrypt";
import { sendAgentCredentialsEmail } from "../../../services/emailService";
import { env } from "../../../config/env";
import { resolveVehicleTypeId, resolveSriLankanCoordinates } from "../utils/taxiHelpers";
import { getStoredCoverageZones, saveStoredCoverageZones, CoverageZone } from "../../../services/coverageService";
import { sendNotificationToUser } from "../../../notifications/fcm-service";
import { getIO } from "../../../socket";
import { clearBookingTimeout, scheduleBookingTimeout, buildBookingReceipt } from "./taxiController";

// Sri Lanka District to Sub-towns / DSDs Mapping for Regional Agent Area Matching
const SL_DISTRICT_TOWNS: Record<string, string[]> = {
  "Colombo": ["Colombo","Dehiwala","Mount Lavinia","Moratuwa","Kotte","Sri Jayawardenepura","Kolonnawa","Kaduwela","Maharagama","Kesbewa","Homagama","Padukka","Ratmalana","Thimbirigasyaya","Nugegoda","Pannipitiya","Kottawa","Battaramulla","Rajagiriya","Malabe","Wellawatte","Bambalapitiya","Kollupitiya","Pettah","Fort"],
  "Gampaha": ["Gampaha","Negombo","Wattala","Ja-Ela","Mahara","Divulapitiya","Attanagalla","Minuwangoda","Katana","Mirigama","Biyagama","Dompe","Kelaniya","Kiribathgoda","Kadawatha","Ragama","Seeduwa","Kandana","Peliyagoda"],
  "Kalutara": ["Kalutara","Panadura","Horana","Matugama","Agalawatta","Beruwala","Bandaragama","Ingiriya","Walallawita","Dodangoda","Aluthgama","Wadduwa"],
  "Kandy": ["Kandy","Kundasale","Peradeniya","Gampola","Nawalapitiya","Harispattuwa","Yatinuwara","Udunuwara","Doluwa","Minipe","Pasbage Korale","Pathahewaheta","Medadumbara","Panvila","Poojapitiya","Tumpane","Ududumbara","Katugastota","Pilimathalawa","Digana","Akurana","Kadugannawa","Gelioya","Menikhinna","Ampitiya"],
  "Matale": ["Matale","Dambulla","Galewela","Rattota","Laggala","Ukuwela","Yatawatta","Naula","Wilgamuwa","Sigiriya"],
  "Nuwara Eliya": ["Nuwara Eliya","Ambagamuwa","Hanguranketha","Kotmale","Walapane","Udapalatha","Maskeliya","Hatton","Talawakele","Nanu Oya"],
  "Galle": ["Galle","Hikkaduwa","Balapitiya","Ambalangoda","Karandeniya","Baddegama","Elpitiya","Imaduwa","Habaraduwa","Akmeemana","Unawatuna","Bentota","Koggala","Karapitiya","Ahangama"],
  "Matara": ["Matara","Weligama","Akuressa","Devinuwara","Dickwella","Hakmana","Kamburupitiya","Kirinda","Kotapola","Mirissa","Gandara"],
  "Hambantota": ["Hambantota","Tangalle","Tissamaharama","Ambalantota","Beliatta","Katuwana","Lunugamvehera","Sooriyawewa","Weeraketiya","Walasmulla"],
  "Jaffna": ["Jaffna","Point Pedro","Nallur","Chavakachcheri","Karaveddy","Kankesanthurai"],
  "Kilinochchi": ["Kilinochchi","Pachchilaipalli","Kandawalai","Karachchi","Poonakari"],
  "Mannar": ["Mannar","Musalai","Madhu","Nanaddan"],
  "Mullaitivu": ["Mullaitivu","Maritimepattu","Oddusuddan","Puthukudiyiruppu"],
  "Vavuniya": ["Vavuniya","Cheddikulam"],
  "Trincomalee": ["Trincomalee","Kinniya","Muttur","Kantalai"],
  "Batticaloa": ["Batticaloa","Eravur","Kalkudah","Valaichchenai","Kattankudy"],
  "Ampara": ["Ampara","Kalmunai","Sammanthurai","Sainthamaruthu","Akkaraipattu","Pottuvil"],
  "Kurunegala": ["Kurunegala","Kuliyapitiya","Alawwa","Bingiriya","Galgamuwa","Ibbagamuwa","Mawathagama","Narammala","Nikaweratiya","Pannala","Polgahawela","Wariyapola"],
  "Puttalam": ["Puttalam","Chilaw","Wennappuwa","Nattandiya","Marawila","Kalpitiya","Anamaduwa"],
  "Anuradhapura": ["Anuradhapura","Mihintale","Kekirawa","Medawachchiya","Eppawala","Talawa","Nochchiyagama"],
  "Polonnaruwa": ["Polonnaruwa","Hingurakgoda","Medirigiriya","Kaduruwela"],
  "Badulla": ["Badulla","Bandarawela","Haputale","Welimada","Ella","Hali-Ela","Mahiyanganaya","Passara"],
  "Monaragala": ["Monaragala","Wellawaya","Bibile","Buttala","Kataragama"],
  "Ratnapura": ["Ratnapura","Eheliyagoda","Kuruvita","Kiriella","Balangoda","Embilipitiya","Pelmadulla","Kahawatta"],
  "Kegalle": ["Kegalle","Mawanella","Rambukkana","Aranayake","Dehiowita","Ruwanwella","Yatiyanthota","Warakapola"]
};

// GET /api/admin/taxi/vehicles - All vehicles with driver info + documents
export async function adminGetAllVehicles(req: AuthRequest, res: Response) {
  try {
    const { status, page = 1, limit = 100, search, q } = req.query;
    const searchTerm = ((search || q || "") as string).trim();
    const where: any = {};
    if (status && status !== "all") where.approvalStatus = status;

    // Filter strictly by agent if requesting user is an Agent (and not Admin)
    const currentUserId = req.user?.userId;
    if (currentUserId) {
      const requestingUser = await db.User.findByPk(currentUserId);
      if (requestingUser && requestingUser.email) {
        const isAdminRole = requestingUser.email === "admin@servefamily.com" || requestingUser.metadata?.role === "admin" || requestingUser.metadata?.role === "superadmin";
        
        if (!isAdminRole) {
          const isAgentRole = requestingUser.metadata?.role === "agent" || requestingUser.email.toLowerCase().includes("agent");
          if (isAgentRole) {
            const agentRecords = await db.Agent.findAll({
              where: {
                [Op.or]: [
                  { email: { [Op.iLike]: requestingUser.email.trim() } },
                  ...(requestingUser.phoneNumber ? [{ phone: requestingUser.phoneNumber.trim() }] : [])
                ]
              }
            });

            // Auto-create Agent record if user has agent role but profile is missing
            if (agentRecords.length === 0) {
              let inferredLocation = "Regional Division";
              const emailParts = requestingUser.email.split("@")[0].split(".");
              if (emailParts.length > 1) {
                const locPart = emailParts[1].charAt(0).toUpperCase() + emailParts[1].slice(1);
                if (locPart.toLowerCase() !== "agent") inferredLocation = locPart;
              }
              try {
                const newProfile = await db.Agent.create({
                  name: requestingUser.name || "Regional Agent",
                  email: requestingUser.email.toLowerCase().trim(),
                  phone: requestingUser.phoneNumber || undefined,
                  locationName: inferredLocation,
                  district: inferredLocation !== "Regional Division" ? inferredLocation : null,
                  status: "active"
                });
                agentRecords.push(newProfile);
              } catch (e) {
                console.warn("⚠️ Auto-creating Agent profile failed:", e);
              }
            }

            const agentIds = agentRecords.map(a => a.id).filter(Boolean);
            const areaKeywords = new Set<string>();

            for (const ag of agentRecords) {
              if (ag.district && ag.district !== "Regional Division") {
                const dist = ag.district.trim();
                areaKeywords.add(dist);
                const subTowns = SL_DISTRICT_TOWNS[dist];
                if (subTowns) subTowns.forEach(t => areaKeywords.add(t));
              }
              if (ag.locationName && ag.locationName !== "Regional Division") {
                const loc = ag.locationName.trim();
                areaKeywords.add(loc);
                const subTowns = SL_DISTRICT_TOWNS[loc];
                if (subTowns) subTowns.forEach(t => areaKeywords.add(t));
              }
              if (ag.coverageArea) {
                try {
                  const parsed = JSON.parse(ag.coverageArea);
                  if (Array.isArray(parsed)) parsed.forEach(p => areaKeywords.add(String(p).trim()));
                  else areaKeywords.add(String(ag.coverageArea).trim());
                } catch {
                  ag.coverageArea.split(",").forEach(p => areaKeywords.add(p.trim()));
                }
              }
              if (ag.dsds) {
                try {
                  const parsed = JSON.parse(ag.dsds);
                  if (Array.isArray(parsed)) parsed.forEach(p => areaKeywords.add(String(p).trim()));
                  else areaKeywords.add(String(ag.dsds).trim());
                } catch {
                  ag.dsds.split(",").forEach(p => areaKeywords.add(p.trim()));
                }
              }
            }

            const agentOrConditions: any[] = [];
            if (agentIds.length > 0) {
              agentOrConditions.push({ agentId: { [Op.in]: agentIds } });
            }

            if (areaKeywords.size > 0) {
              const kwList = Array.from(areaKeywords).filter(k => k && k.length >= 2);
              for (const kw of kwList) {
                agentOrConditions.push({
                  baseAddress: { [Op.iLike]: `%${kw}%` }
                });
              }
            }

            // When an agent is actively searching (looking up a plate or mobile number),
            // do NOT restrict to regional boundaries so ANY agent can find and approve ANY vehicle island-wide:
            // "oni agent kenekta oni driver kenekge vehicle ekak gahala approved karanna puluwan wenna oni"
            if (!searchTerm && agentOrConditions.length > 0) {
              where[Op.and] = [
                ...(where[Op.and] || []),
                { [Op.or]: agentOrConditions }
              ];
            }
          }
        }
      }
    }

    // Server-side text search (plate, phone, baseAddress, driver name/email)
    if (searchTerm) {
      const cleanSearch = searchTerm.replace(/[^a-zA-Z0-9]/g, "");
      const phoneDigits = searchTerm.replace(/[^0-9]/g, "");
      const last9Phone = phoneDigits.length >= 9 ? phoneDigits.slice(-9) : (phoneDigits.length >= 6 ? phoneDigits : "");

      const searchOr: any[] = [
        { vehicleRegNum: { [Op.iLike]: `%${searchTerm}%` } },
        { mobileNum: { [Op.iLike]: `%${searchTerm}%` } },
        { baseAddress: { [Op.iLike]: `%${searchTerm}%` } },
        db.sequelize.where(db.sequelize.col("driver.name"), { [Op.iLike]: `%${searchTerm}%` }),
        db.sequelize.where(db.sequelize.col("driver.phone_number"), { [Op.iLike]: `%${searchTerm}%` }),
        db.sequelize.where(db.sequelize.col("driver.email"), { [Op.iLike]: `%${searchTerm}%` }),
      ];
      if (cleanSearch && cleanSearch.length >= 2) {
        searchOr.push(
          db.sequelize.where(
            db.sequelize.fn("regexp_replace", db.sequelize.col("Vehicle.vehicle_reg_num"), "[^a-zA-Z0-9]", "", "g"),
            { [Op.iLike]: `%${cleanSearch}%` }
          )
        );
      }
      if (last9Phone) {
        searchOr.push(
          { mobileNum: { [Op.iLike]: `%${last9Phone}%` } },
          db.sequelize.where(db.sequelize.col("driver.phone_number"), { [Op.iLike]: `%${last9Phone}%` })
        );
      }
      where[Op.and] = [
        ...(where[Op.and] || []),
        { [Op.or]: searchOr }
      ];
    }

    const offset = (Number(page) - 1) * Number(limit);

    const vehicles = await db.Vehicle.findAndCountAll({
      where,
      include: [
        {
          model: db.User,
          as: "driver",
          attributes: ["id", "name", "email", "phoneNumber", "avatar", "latitude", "longitude", "updatedAt", "createdAt"],
          include: [
            {
              model: db.DriverDocument,
              as: "documents",
              required: false,
            },
          ],
        },
        {
          model: db.VehicleType,
          as: "vehicleType",
          attributes: ["id", "type", "category"],
        },
        {
          model: db.VehicleImage,
          as: "images",
          required: false,
        },
        {
          model: db.Agent,
          as: "agent",
          attributes: ["id", "name", "locationName", "district", "province"],
          required: false,
        },
      ],
      limit: Number(limit),
      offset,
      order: [["createdAt", "DESC"]],
      distinct: true,
    });

    // Driver account online synchronization for admin dashboard
    const { isDriverSocketConnected } = await import("../../../socket");
    vehicles.rows.forEach((v: any) => {
      const isSocketLive = Boolean(isDriverSocketConnected(v.userId) || isDriverSocketConnected(v.id));
      const isOnline = Boolean(v.isActive) || isSocketLive;
      v.setDataValue("isOnline", isOnline);
      if (isSocketLive && !v.isActive) {
        v.setDataValue("isActive", true);
        v.update({ isActive: true, updatedAt: new Date() }).catch(() => {});
      }
    });

    return res.json({
      success: true,
      data: vehicles.rows,
      total: vehicles.count,
      page: Number(page),
      pages: Math.ceil(vehicles.count / Number(limit)),
    });
  } catch (err) {
    console.error("❌ Admin Get Vehicles Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// Helper to determine approver info
interface ApproverInfo {
  name: string;
  id: string;
  isAgent: boolean;
  agentId: string | null;
}

async function getApproverInfo(userId?: string): Promise<ApproverInfo> {
  if (!userId) return { name: "System Admin", id: "system", isAgent: false, agentId: null };
  const user = await db.User.findByPk(userId);
  if (!user || !user.email) return { name: user?.name || "System Admin", id: userId, isAgent: false, agentId: null };

  if (user.metadata?.role === "agent" || user.email.toLowerCase().includes("agent")) {
    const agent = await db.Agent.findOne({
      where: {
        [Op.or]: [
          { email: { [Op.iLike]: user.email.trim() } },
          ...(user.phoneNumber ? [{ phone: user.phoneNumber.trim() }] : [])
        ]
      }
    });
    if (agent) {
      return {
        name: `${agent.name} (${agent.locationName || agent.district || 'Agent'})`,
        id: agent.id,
        isAgent: true,
        agentId: agent.id
      };
    }
  }

  return {
    name: user.name || user.email || "Primary System Admin",
    id: user.id,
    isAgent: false,
    agentId: null
  };
}

export interface AgentContext {
  isAdmin: boolean;
  isAgent: boolean;
  agentIds: string[];
  areaKeywords: string[];
}

export async function getAgentContext(userId?: string): Promise<AgentContext> {
  if (!userId) return { isAdmin: false, isAgent: false, agentIds: [], areaKeywords: [] };
  const user = await db.User.findByPk(userId);
  if (!user || !user.email) return { isAdmin: false, isAgent: false, agentIds: [], areaKeywords: [] };

  const isAdminRole = user.email === "admin@servefamily.com" || user.metadata?.role === "admin" || user.metadata?.role === "superadmin";
  if (isAdminRole) {
    return { isAdmin: true, isAgent: false, agentIds: [], areaKeywords: [] };
  }

  const isAgentRole = user.metadata?.role === "agent" || user.email.toLowerCase().includes("agent");
  if (!isAgentRole) {
    return { isAdmin: false, isAgent: false, agentIds: [], areaKeywords: [] };
  }

  const agentRecords = await db.Agent.findAll({
    where: {
      [Op.or]: [
        { email: { [Op.iLike]: user.email.trim() } },
        ...(user.phoneNumber ? [{ phone: user.phoneNumber.trim() }] : [])
      ]
    }
  });

  const agentIds = agentRecords.map((a: any) => a.id).filter(Boolean);
  const areaKeywords = new Set<string>();

  for (const ag of agentRecords) {
    if (ag.district && ag.district !== "Regional Division") {
      const dist = ag.district.trim();
      areaKeywords.add(dist);
      const subTowns = SL_DISTRICT_TOWNS[dist];
      if (subTowns) subTowns.forEach(t => areaKeywords.add(t));
    }
    if (ag.locationName && ag.locationName !== "Regional Division") {
      const loc = ag.locationName.trim();
      areaKeywords.add(loc);
      const subTowns = SL_DISTRICT_TOWNS[loc];
      if (subTowns) subTowns.forEach(t => areaKeywords.add(t));
    }
    if (ag.coverageArea) {
      try {
        const parsed = JSON.parse(ag.coverageArea);
        if (Array.isArray(parsed)) parsed.forEach((p: any) => areaKeywords.add(String(p).trim()));
        else areaKeywords.add(String(ag.coverageArea).trim());
      } catch {
        ag.coverageArea.split(",").forEach((p: string) => areaKeywords.add(p.trim()));
      }
    }
    if (ag.dsds) {
      try {
        const parsed = JSON.parse(ag.dsds);
        if (Array.isArray(parsed)) parsed.forEach((p: any) => areaKeywords.add(String(p).trim()));
        else areaKeywords.add(String(ag.dsds).trim());
      } catch {
        ag.dsds.split(",").forEach((p: string) => areaKeywords.add(p.trim()));
      }
    }
  }

  return {
    isAdmin: false,
    isAgent: true,
    agentIds,
    areaKeywords: Array.from(areaKeywords).filter(k => k && k.length >= 2)
  };
}

function canAgentAccessBooking(agentCtx: AgentContext, booking: any): boolean {
  if (agentCtx.isAdmin) return true;
  if (!agentCtx.isAgent) return true;

  const vehicleAgentId = booking?.vehicle?.agentId || booking?.vehicle?.agent_id;
  if (vehicleAgentId && agentCtx.agentIds.includes(vehicleAgentId)) {
    return true;
  }

  const vBase = (booking?.vehicle?.baseAddress || "").toLowerCase();
  const pickup = (booking?.pickupAddress || "").toLowerCase();
  const drop = (booking?.dropAddress || "").toLowerCase();

  return agentCtx.areaKeywords.some(kw => {
    const k = kw.toLowerCase();
    return vBase.includes(k) || pickup.includes(k) || drop.includes(k);
  });
}

// PATCH /api/admin/taxi/vehicles/:id/approve
export async function adminApproveVehicle(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const vehicle = await db.Vehicle.findByPk(id);
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

    const approver = await getApproverInfo(req.user?.userId);

    // Only assign agentId if vehicle already has an agent or the approver is an authentic Agent in taxi_agents table
    let targetAgentId: string | null = vehicle.agentId || null;
    if (!targetAgentId && approver.isAgent && approver.agentId) {
      targetAgentId = approver.agentId;
    }

    // Flaw 7 Fix: Do NOT force driver online upon document approval. Driver goes online voluntarily via app toggle.
    await vehicle.update({
      approvalStatus: "approved",
      agentId: targetAgentId,
      approvedBy: approver.name,
      approvedById: approver.id,
      approvedAt: new Date(),
      approvalReason: reason || "Approved by regional agent/admin"
    });

    // Also update driver user metadata so role='driver' is persisted
    if (vehicle.userId) {
      try {
        const driverUser = await db.User.findByPk(vehicle.userId);
        if (driverUser) {
          const existingMeta = typeof driverUser.metadata === "object" && driverUser.metadata !== null ? driverUser.metadata : {};
          await driverUser.update({
            metadata: {
              ...existingMeta,
              role: "driver"
            }
          });

          // Send push notification to driver
          await sendNotificationToUser(
            driverUser.id,
            "Vehicle Registration Approved! 🚕🎉",
            `Congratulations! Your vehicle (${vehicle.vehicleRegNum || "Taxi"}) has been approved by ${approver.name}. You are now ready to accept rides!`,
            {
              type: "VEHICLE_APPROVED",
              vehicleId: String(vehicle.id),
              status: "approved"
            },
            req.user?.userId
          );
        }
      } catch (notifErr) {
        console.warn("⚠️ Driver role update / notification skipped:", notifErr);
      }
    }

    await logAdminActivity(req, "APPROVE_VEHICLE", "Vehicle", id, {
      approvedBy: approver.name,
      reason: reason || "Approved by regional agent/admin"
    });

    return res.json({ success: true, message: `Vehicle approved by ${approver.name}`, data: vehicle });
  } catch (err: any) {
    console.error("❌ Admin Approve Vehicle Error:", err);
    return res.status(500).json({ success: false, message: err?.message || "Server error" });
  }
}

/**
 * GET /api/admin/taxi/vehicles/lookup?query=...
 * Allows ANY agent or admin to look up any driver's vehicle by mobile number or registration plate
 */
export async function adminQuickLookupVehicle(req: AuthRequest, res: Response) {
  try {
    const rawQuery = String(req.query.query || req.query.q || req.query.search || "").trim();
    if (!rawQuery) {
      return res.status(400).json({ success: false, message: "Please enter a driver mobile number or vehicle plate number" });
    }

    const cleanSearch = rawQuery.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const phoneDigits = rawQuery.replace(/[^0-9]/g, "");
    const isFullPhone = phoneDigits.length >= 9 && phoneDigits.length <= 12;
    const isFullPlate = cleanSearch.length >= 4;

    if (!isFullPhone && !isFullPlate) {
      return res.status(400).json({
        success: false,
        message: "Please enter the complete 10-digit mobile number (e.g. 0771234567) or full vehicle plate (e.g. WP CAB-1234 / WP-5678). Partial entries are not permitted."
      });
    }

    const searchOr: any[] = [];

    if (isFullPhone) {
      const last9Phone = phoneDigits.slice(-9);
      searchOr.push(
        db.sequelize.where(
          db.sequelize.fn("regexp_replace", db.sequelize.col("driver.phone_number"), "[^0-9]", "", "g"),
          { [Op.iLike]: `%${last9Phone}` }
        ),
        db.sequelize.where(
          db.sequelize.fn("regexp_replace", db.sequelize.col("Vehicle.mobile_num"), "[^0-9]", "", "g"),
          { [Op.iLike]: `%${last9Phone}` }
        )
      );
    }

    if (isFullPlate) {
      searchOr.push(
        db.sequelize.where(
          db.sequelize.fn("upper", db.sequelize.fn("regexp_replace", db.sequelize.col("Vehicle.vehicle_reg_num"), "[^a-zA-Z0-9]", "", "g")),
          cleanSearch
        ),
        { vehicleRegNum: { [Op.iLike]: rawQuery } },
        db.sequelize.where(
          db.sequelize.fn("upper", db.sequelize.fn("regexp_replace", db.sequelize.col("Vehicle.vehicle_reg_num"), "[^a-zA-Z0-9]", "", "g")),
          { [Op.iLike]: `%${cleanSearch}` }
        )
      );
    }

    const matches = await db.Vehicle.findAll({
      where: {
        [Op.or]: searchOr
      },
      include: [
        {
          model: db.User,
          as: "driver",
          attributes: ["id", "name", "email", "phoneNumber", "avatar", "createdAt"],
          include: [
            {
              model: db.DriverDocument,
              as: "documents",
              required: false
            }
          ]
        },
        {
          model: db.VehicleType,
          as: "vehicleType",
          attributes: ["id", "type", "category"]
        },
        {
          model: db.VehicleImage,
          as: "images",
          required: false
        },
        {
          model: db.Agent,
          as: "agent",
          attributes: ["id", "name", "locationName", "district", "province"],
          required: false
        }
      ],
      subQuery: false,
      limit: 10,
      order: [["createdAt", "DESC"]]
    });

    return res.json({
      success: true,
      query: rawQuery,
      count: matches.length,
      data: matches
    });
  } catch (err: any) {
    console.error("❌ Admin Quick Lookup Vehicle Error:", err);
    return res.status(500).json({ success: false, message: "Server error searching vehicle", error: err?.message });
  }
}

/**
 * POST /api/admin/taxi/vehicles/quick-approve
 * Allows ANY agent or admin to instantly verify and approve any driver's vehicle by plate or phone
 */
export async function adminQuickApproveVehicle(req: AuthRequest, res: Response) {
  try {
    const { vehicleId, query, reason } = req.body || {};
    let targetVehicle = null;

    if (vehicleId) {
      targetVehicle = await db.Vehicle.findByPk(vehicleId);
    } else if (query && String(query).trim()) {
      const rawQuery = String(query).trim();
      const cleanSearch = rawQuery.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      const phoneDigits = rawQuery.replace(/[^0-9]/g, "");
      const isFullPhone = phoneDigits.length >= 9 && phoneDigits.length <= 12;
      const isFullPlate = cleanSearch.length >= 4;

      if (!isFullPhone && !isFullPlate) {
        return res.status(400).json({
          success: false,
          message: "Please enter a complete 10-digit mobile number or full vehicle plate number."
        });
      }

      const searchOr: any[] = [];

      if (isFullPhone) {
        const last9Phone = phoneDigits.slice(-9);
        searchOr.push(
          db.sequelize.where(
            db.sequelize.fn("regexp_replace", db.sequelize.col("driver.phone_number"), "[^0-9]", "", "g"),
            { [Op.iLike]: `%${last9Phone}` }
          ),
          db.sequelize.where(
            db.sequelize.fn("regexp_replace", db.sequelize.col("Vehicle.mobile_num"), "[^0-9]", "", "g"),
            { [Op.iLike]: `%${last9Phone}` }
          )
        );
      }

      if (isFullPlate) {
        searchOr.push(
          db.sequelize.where(
            db.sequelize.fn("upper", db.sequelize.fn("regexp_replace", db.sequelize.col("Vehicle.vehicle_reg_num"), "[^a-zA-Z0-9]", "", "g")),
            cleanSearch
          ),
          { vehicleRegNum: { [Op.iLike]: rawQuery } },
          db.sequelize.where(
            db.sequelize.fn("upper", db.sequelize.fn("regexp_replace", db.sequelize.col("Vehicle.vehicle_reg_num"), "[^a-zA-Z0-9]", "", "g")),
            { [Op.iLike]: `%${cleanSearch}` }
          )
        );
      }

      const matches = await db.Vehicle.findAll({
        where: { [Op.or]: searchOr },
        include: [{ model: db.User, as: "driver", attributes: ["id", "name", "phoneNumber", "email"] }],
        subQuery: false,
        limit: 5,
        order: [["createdAt", "DESC"]]
      });

      if (!matches.length) {
        return res.status(404).json({ success: false, message: `No vehicle found matching "${rawQuery}". Please check mobile number or registration plate.` });
      }

      if (matches.length > 1 && !vehicleId) {
        return res.status(200).json({
          success: false,
          needsSelection: true,
          message: `Found ${matches.length} matching vehicles. Please select which vehicle to approve.`,
          data: matches
        });
      }

      targetVehicle = matches[0];
    } else {
      return res.status(400).json({ success: false, message: "vehicleId or search query (phone / vehicle plate) required" });
    }

    if (!targetVehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    const approver = await getApproverInfo(req.user?.userId);

    // If approver is an Agent, assign to agentId
    let targetAgentId = targetVehicle.agentId || null;
    if (approver.isAgent && approver.agentId) {
      targetAgentId = approver.agentId;
    }

    // Flaw 7 Fix: Do NOT force driver online upon document approval. Driver goes online voluntarily via app toggle.
    await targetVehicle.update({
      approvalStatus: "approved",
      agentId: targetAgentId,
      approvedBy: approver.name,
      approvedById: approver.id,
      approvedAt: new Date(),
      approvalReason: reason || `Approved by ${approver.name} via instant agent verification`
    });

    // Update driver user role to 'driver'
    if (targetVehicle.userId) {
      try {
        const driverUser = await db.User.findByPk(targetVehicle.userId);
        if (driverUser) {
          const existingMeta = typeof driverUser.metadata === "object" && driverUser.metadata !== null ? driverUser.metadata : {};
          await driverUser.update({
            metadata: {
              ...existingMeta,
              role: "driver"
            }
          });

          await sendNotificationToUser(
            driverUser.id,
            "Vehicle Registration Approved! 🚕🎉",
            `Congratulations! Your vehicle (${targetVehicle.vehicleRegNum || "Taxi"}) has been verified & approved by ${approver.name}. You are now active and ready to accept rides!`,
            {
              type: "VEHICLE_APPROVED",
              vehicleId: String(targetVehicle.id),
              status: "approved"
            },
            req.user?.userId
          );
        }
      } catch (notifErr) {
        console.warn("⚠️ Driver role update / notification skipped:", notifErr);
      }
    }

    await logAdminActivity(req, "APPROVE_VEHICLE_BY_AGENT", "Vehicle", targetVehicle.id, {
      approvedBy: approver.name,
      vehicleRegNum: targetVehicle.vehicleRegNum,
      reason: reason || "Instant Agent Approval"
    });

    // Reload with associations for rich response
    const reloaded = await db.Vehicle.findByPk(targetVehicle.id, {
      include: [
        { model: db.User, as: "driver", attributes: ["id", "name", "email", "phoneNumber", "avatar"] },
        { model: db.VehicleType, as: "vehicleType", attributes: ["id", "type", "category"] },
        { model: db.Agent, as: "agent", attributes: ["id", "name", "district", "locationName"] }
      ]
    });

    return res.json({
      success: true,
      message: `Vehicle ${targetVehicle.vehicleRegNum || ""} successfully approved by ${approver.name}!`,
      data: reloaded
    });
  } catch (err: any) {
    console.error("❌ Admin Quick Approve Vehicle Error:", err);
    return res.status(500).json({ success: false, message: "Server error approving vehicle", error: err?.message });
  }
}

// PATCH /api/admin/taxi/vehicles/:id/reject
export async function adminRejectVehicle(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const vehicle = await db.Vehicle.findByPk(id);
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

    const approver = await getApproverInfo(req.user?.userId);

    await vehicle.update({
      approvalStatus: "rejected",
      isActive: false,
      approvedBy: approver.name,
      approvedById: approver.id,
      approvedAt: new Date(),
      approvalReason: reason || "Rejected by regional agent/admin"
    });

    if (vehicle.userId) {
      try {
        await sendNotificationToUser(
          vehicle.userId,
          "Vehicle Registration Update",
          `Your vehicle registration (${vehicle.vehicleRegNum || "Taxi"}) was rejected. Reason: ${reason || "Not specified"}`,
          {
            type: "VEHICLE_REJECTED",
            vehicleId: String(vehicle.id),
            status: "rejected"
          },
          req.user?.userId
        );
      } catch (notifErr) {
        console.warn("⚠️ Driver rejection push notification skipped:", notifErr);
      }
    }

    await logAdminActivity(req, "REJECT_VEHICLE", "Vehicle", id, {
      rejectedBy: approver.name,
      reason: reason || "Rejected by regional agent/admin"
    });

    return res.json({ success: true, message: `Vehicle rejected by ${approver.name}`, data: vehicle });
  } catch (err: any) {
    console.error("❌ Admin Reject Vehicle Error:", err);
    return res.status(500).json({ success: false, message: err?.message || "Server error" });
  }
}

// PATCH /api/admin/taxi/vehicles/:id/suspend
export async function adminSuspendVehicle(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const vehicle = await db.Vehicle.findByPk(id);
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

    const approver = await getApproverInfo(req.user?.userId);

    await vehicle.update({
      approvalStatus: "suspended",
      isActive: false,
      approvedBy: approver.name,
      approvedById: approver.id,
      approvedAt: new Date(),
      approvalReason: reason || "Suspended by admin"
    });

    await logAdminActivity(req, "SUSPEND_VEHICLE", "Vehicle", id, {
      suspendedBy: approver.name,
      reason: reason || "Suspended by admin"
    });

    return res.json({ success: true, message: "Vehicle suspended", data: vehicle });
  } catch (err: any) {
    console.error("❌ Admin Suspend Vehicle Error:", err);
    return res.status(500).json({ success: false, message: err?.message || "Server error" });
  }
}

// GET /api/admin/taxi/stats
export async function adminGetStats(req: AuthRequest, res: Response) {
  try {
    const total = await db.Vehicle.count();
    const pending = await db.Vehicle.count({ where: { approvalStatus: "pending" } });
    const approved = await db.Vehicle.count({ where: { approvalStatus: "approved" } });
    const rejected = await db.Vehicle.count({ where: { approvalStatus: "rejected" } });
    const suspended = await db.Vehicle.count({ where: { approvalStatus: "suspended" } });
    const active = await db.Vehicle.count({ where: { isActive: true } });

    const totalUsers = await db.User.count();
    const verifiedUsers = await db.User.count({ where: { emailVerified: true } });
    const totalAgents = await db.Agent.count();

    return res.json({
      success: true,
      data: {
        total,
        pending,
        approved,
        rejected,
        suspended,
        active,
        totalUsers,
        verifiedUsers,
        totalAgents
      },
    });
  } catch (err) {
    console.error("❌ Admin Stats Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// GET /api/admin/taxi/vehicles/:id - Single vehicle details
export async function adminGetVehicleById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const vehicle = await db.Vehicle.findByPk(id, {
      include: [
        {
          model: db.User,
          as: "driver",
          attributes: ["id", "name", "email", "phoneNumber", "avatar", "createdAt"],
          include: [
            { model: db.DriverDocument, as: "documents", required: false },
          ],
        },
        {
          model: db.VehicleType,
          as: "vehicleType",
        },
        {
          model: db.VehicleImage,
          as: "images",
        },
      ],
    });

    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });
    return res.json({ success: true, data: vehicle });
  } catch (err) {
    console.error("❌ Admin Get Vehicle Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ============================================================
// AGENT & REGIONAL MANAGEMENT CONTROLLERS
// ============================================================

// GET /api/admin/agents - List all agents with assigned drivers
export async function adminGetAgents(req: AuthRequest, res: Response) {
  try {
    const agents = await db.Agent.findAll({
      include: [
        {
          model: db.Vehicle,
          as: "vehicles",
          attributes: ["id", "vehicleRegNum", "approvalStatus", "isActive", "mobileNum", "baseAddress"],
          include: [
            {
              model: db.User,
              as: "driver",
              attributes: ["id", "name", "email", "phoneNumber", "avatar"]
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    return res.json({ success: true, data: agents });
  } catch (err) {
    console.error("❌ Admin Get Agents Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// POST /api/admin/agents - Create a new location-based Agent
export async function adminCreateAgent(req: AuthRequest, res: Response) {
  try {
    const { name, email, phone, phoneNumber, locationName, province, district, dsds, latitude, longitude, coverageArea, password, sendEmail = true } = req.body;
    const contactPhone = phone || phoneNumber;
    const resolvedLocation = locationName || district || province || name;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and email are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Password handling: manual or auto-generated
    let plainPassword = password ? String(password).trim() : '';
    if (!plainPassword) {
      const randStr = Math.random().toString(36).substring(2, 8);
      plainPassword = `Agent#${randStr}!`;
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // 1. Sync or Create User account with role 'agent'
    let user = await db.User.findOne({ where: { email: normalizedEmail } });
    if (!user) {
      user = await db.User.create({
        name,
        email: normalizedEmail,
        password: hashedPassword,
        emailVerified: true,
        phoneNumber: contactPhone || null,
        metadata: { role: "agent" },
      });
    } else {
      const existingMeta = (typeof user.metadata === 'object' && user.metadata !== null) ? user.metadata : {};
      const updatedMetadata = { ...existingMeta, role: "agent" };
      await user.update({
        password: hashedPassword,
        emailVerified: true,
        metadata: updatedMetadata,
        ...(name && { name }),
        ...(contactPhone && { phoneNumber: contactPhone }),
      });
    }

    // 2. Create or Update Agent record
    let agent = await db.Agent.findOne({ where: { email: { [Op.iLike]: normalizedEmail } } });
    if (agent) {
      await agent.update({
        name,
        phone: contactPhone || agent.phone,
        locationName: resolvedLocation,
        province: province || agent.province,
        district: district || agent.district,
        dsds: dsds ? (Array.isArray(dsds) ? JSON.stringify(dsds) : String(dsds)) : agent.dsds,
        latitude: latitude ? Number(latitude) : agent.latitude,
        longitude: longitude ? Number(longitude) : agent.longitude,
        coverageArea: coverageArea ? (typeof coverageArea === 'string' ? coverageArea : JSON.stringify(coverageArea)) : agent.coverageArea,
        status: "active"
      });
    } else {
      agent = await db.Agent.create({
        name,
        email: normalizedEmail,
        phone: contactPhone || null,
        locationName: resolvedLocation,
        province: province || null,
        district: district || null,
        dsds: dsds ? (Array.isArray(dsds) ? JSON.stringify(dsds) : String(dsds)) : null,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        coverageArea: coverageArea ? (typeof coverageArea === 'string' ? coverageArea : JSON.stringify(coverageArea)) : null,
        status: "active"
      });
    }

    // 3. Dispatch credentials email
    let emailSent = false;
    if (sendEmail !== false) {
      emailSent = await sendAgentCredentialsEmail(normalizedEmail, name, plainPassword, resolvedLocation);
    }

    return res.status(201).json({
      success: true,
      message: emailSent
        ? "Agent created successfully and login credentials sent to email!"
        : "Agent created successfully!",
      data: {
        ...agent.toJSON(),
        generatedPassword: plainPassword,
        credentialsSent: emailSent
      }
    });
  } catch (err: any) {
    console.error("❌ Admin Create Agent Error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}

// POST /api/admin/agents/:id/resend-credentials - Resend credentials email to an agent
export async function adminResendAgentCredentials(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const agent = await db.Agent.findByPk(id);
    if (!agent) return res.status(404).json({ success: false, message: "Agent not found" });

    let plainPassword = password ? String(password).trim() : '';
    if (!plainPassword) {
      const randStr = Math.random().toString(36).substring(2, 8);
      plainPassword = `Agent#${randStr}!`;
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const user = await db.User.findOne({ where: { email: agent.email } });
    if (user) {
      const existingMeta = (typeof user.metadata === 'object' && user.metadata !== null) ? user.metadata : {};
      const updatedMetadata = { ...existingMeta, role: "agent" };
      await user.update({ password: hashedPassword, emailVerified: true, metadata: updatedMetadata });
    } else {
      await db.User.create({
        name: agent.name,
        email: agent.email,
        password: hashedPassword,
        emailVerified: true,
        phoneNumber: agent.phone || null,
        metadata: { role: "agent" }
      });
    }

    const emailSent = await sendAgentCredentialsEmail(agent.email, agent.name, plainPassword, agent.locationName);

    return res.json({
      success: true,
      message: emailSent
        ? `Login credentials email successfully sent to ${agent.email}`
        : `Credentials updated, but email could not be sent. Password: ${plainPassword}`,
      data: {
        generatedPassword: plainPassword,
        credentialsSent: emailSent
      }
    });
  } catch (err: any) {
    console.error("❌ Admin Resend Agent Credentials Error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}

// PATCH /api/admin/agents/:id - Update agent details
export async function adminUpdateAgent(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, email, phone, locationName, province, district, dsds, latitude, longitude, coverageArea, status, password, sendEmail } = req.body;

    const agent = await db.Agent.findByPk(id);
    if (!agent) return res.status(404).json({ success: false, message: "Agent not found" });

    await agent.update({
      ...(name && { name }),
      ...(email && { email }),
      ...(phone && { phone }),
      ...(locationName && { locationName }),
      ...(province !== undefined && { province }),
      ...(district !== undefined && { district }),
      ...(dsds !== undefined && { dsds: Array.isArray(dsds) ? JSON.stringify(dsds) : dsds }),
      ...(latitude !== undefined && { latitude: Number(latitude) }),
      ...(longitude !== undefined && { longitude: Number(longitude) }),
      ...(coverageArea !== undefined && { coverageArea: typeof coverageArea === 'string' ? coverageArea : JSON.stringify(coverageArea) }),
      ...(status && { status })
    });

    // Handle password update / email sending if provided
    let plainPassword = password ? String(password).trim() : '';
    let emailSent = false;

    if (password || sendEmail) {
      if (!plainPassword) {
        const randStr = Math.random().toString(36).substring(2, 8);
        plainPassword = `Agent#${randStr}!`;
      }

      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      const user = await db.User.findOne({ where: { email: agent.email } });
      if (user) {
        const existingMeta = (typeof user.metadata === 'object' && user.metadata !== null) ? user.metadata : {};
        const updatedMetadata = { ...existingMeta, role: "agent" };
        await user.update({ password: hashedPassword, emailVerified: true, metadata: updatedMetadata });
      }

      if (sendEmail) {
        emailSent = await sendAgentCredentialsEmail(agent.email, agent.name, plainPassword, agent.locationName);
      }
    }

    return res.json({
      success: true,
      message: "Agent updated successfully",
      data: {
        ...agent.toJSON(),
        ...(plainPassword && { generatedPassword: plainPassword }),
        ...(sendEmail && { credentialsSent: emailSent })
      }
    });
  } catch (err) {
    console.error("❌ Admin Update Agent Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// DELETE /api/admin/agents/:id - Delete agent & unassign vehicles
export async function adminDeleteAgent(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const agent = await db.Agent.findByPk(id);
    if (!agent) return res.status(404).json({ success: false, message: "Agent not found" });

    // Unassign vehicles
    await db.Vehicle.update({ agentId: null }, { where: { agentId: id } });
    await agent.destroy();

    return res.json({ success: true, message: "Agent deleted & vehicles unassigned" });
  } catch (err) {
    console.error("❌ Admin Delete Agent Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// POST /api/admin/agents/:id/assign-drivers - Assign vehicles to an Agent
export async function adminAssignDriversToAgent(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { vehicleIds } = req.body; // Array of vehicle IDs

    const agent = await db.Agent.findByPk(id);
    if (!agent) return res.status(404).json({ success: false, message: "Agent not found" });

    if (!Array.isArray(vehicleIds)) {
      return res.status(400).json({ success: false, message: "vehicleIds must be an array" });
    }

    // Unassign vehicles that were previously assigned to this agent but now unchecked
    await db.Vehicle.update(
      { agentId: null },
      {
        where: {
          agentId: id,
          id: { [Op.notIn]: vehicleIds }
        }
      }
    );

    // Assign checked vehicles
    if (vehicleIds.length > 0) {
      await db.Vehicle.update({ agentId: id }, { where: { id: vehicleIds } });
    }

    const updatedAgent = await db.Agent.findByPk(id, {
      include: [{ model: db.Vehicle, as: "vehicles" }]
    });

    return res.json({ success: true, message: `${vehicleIds.length} driver(s) assigned to agent ${agent.name}`, data: updatedAgent });
  } catch (err) {
    console.error("❌ Admin Assign Drivers Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ============================================================
// SERVE FAMILY USERS & LOCATION TRACKING CONTROLLERS
// ============================================================

// GET /api/admin/users - List all Serve Family users with live location & password info
export async function adminGetAllUsers(req: AuthRequest, res: Response) {
  try {
    const users = await db.User.findAll({
      attributes: [
        "id", "name", "email", "password", "emailVerified", "phoneNumber", "phoneVerified",
        "avatar", "isTracker", "latitude", "longitude", "metadata", "createdAt", "updatedAt"
      ],
      order: [["createdAt", "DESC"]]
    });

    // Resolve fallback location from LocationHistory if User.latitude is null
    const usersNeedingLoc = users.filter((u: any) => u.latitude == null || u.longitude == null);
    if (usersNeedingLoc.length > 0) {
      const userIds = usersNeedingLoc.map((u: any) => u.id);
      const recentHistory = await db.LocationHistory.findAll({
        where: { userId: userIds },
        order: [["createdAt", "DESC"]]
      });
      const locMap: Record<string, { lat: number; lon: number }> = {};
      recentHistory.forEach((loc: any) => {
        if (!locMap[loc.userId]) {
          locMap[loc.userId] = { lat: loc.latitude, lon: loc.longitude };
        }
      });

      users.forEach((u: any) => {
        if ((u.latitude == null || u.longitude == null) && locMap[u.id]) {
          u.setDataValue("latitude", locMap[u.id].lat);
          u.setDataValue("longitude", locMap[u.id].lon);
        }
      });
    }

    return res.json({ success: true, data: users });
  } catch (err) {
    console.error("❌ Admin Get Users Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// PATCH /api/admin/taxi/users/:id - Update user details
export async function adminUpdateUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { name, email, phoneNumber, emailVerified, phoneVerified, isTracker } = req.body;

    const user = await db.User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    await user.update({
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email: email ? String(email).trim().toLowerCase() : null }),
      ...(phoneNumber !== undefined && { phoneNumber: phoneNumber ? String(phoneNumber).trim() : null }),
      ...(emailVerified !== undefined && { emailVerified: Boolean(emailVerified) }),
      ...(phoneVerified !== undefined && { phoneVerified: Boolean(phoneVerified) }),
      ...(isTracker !== undefined && { isTracker: Boolean(isTracker) }),
    });

    return res.json({ success: true, message: "User details updated successfully", data: user });
  } catch (err) {
    console.error("❌ Admin Update User Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// DELETE /api/admin/taxi/users/:id - Delete user account
export async function adminDeleteUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const user = await db.User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    await user.destroy();
    return res.json({ success: true, message: "User account deleted successfully" });
  } catch (err) {
    console.error("❌ Admin Delete User Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// POST /api/admin/users/:id/reset-password - Admin reset password for a user
export async function adminResetUserPassword(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters long" });
    }

    const user = await db.User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const bcrypt = await import("bcrypt");
    const { env } = await import("../../../config/env");
    const hashedPassword = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);

    await user.update({ password: hashedPassword });

    return res.json({ success: true, message: `Password successfully updated for ${user.email || user.name}` });
  } catch (err) {
    console.error("❌ Admin Reset User Password Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// GET /api/admin/taxi/plans - List all subscription plans
export async function adminGetPlans(req: AuthRequest, res: Response) {
  try {
    const plans = await db.Plan.findAll({
      order: [
        [db.sequelize.literal(`CASE "name" WHEN 'Free' THEN 1 WHEN 'Silver' THEN 2 WHEN 'Gold' THEN 3 WHEN 'Platinum' THEN 4 ELSE 5 END`), 'ASC']
      ]
    });
    return res.json({ success: true, data: plans });
  } catch (err) {
    console.error("❌ Admin Get Plans Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// PATCH /api/admin/taxi/plans/:id - Update plan pricing & features
export async function adminUpdatePlan(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      maxGroups,
      maxTracking,
      maxDevices,
      hasSms,
      hasPhoneAlert,
      price,
      mobileWeb,
      health,
      notifications,
      phoneAlert,
      sms,
      btnText,
      badgeText,
      isPopular,
      features,
      metadata: incomingMetadata
    } = req.body;

    const plan = await db.Plan.findByPk(id);
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });

    const updatedMetadata = {
      ...(plan.metadata || {}),
      ...(incomingMetadata || {}),
      ...(price !== undefined && { price: Number(price) }),
      ...(mobileWeb !== undefined && { mobileWeb: String(mobileWeb) }),
      ...(health !== undefined && { health: String(health) }),
      ...(notifications !== undefined && { notifications: String(notifications) }),
      ...(phoneAlert !== undefined && { phoneAlert: String(phoneAlert) }),
      ...(sms !== undefined && { sms: String(sms) }),
      ...(btnText !== undefined && { btnText: String(btnText) }),
      ...(badgeText !== undefined && { badgeText: String(badgeText) }),
      ...(isPopular !== undefined && { isPopular: Boolean(isPopular) }),
      ...(features !== undefined && { features })
    };

    const resolvedHasSms = hasSms !== undefined 
      ? Boolean(hasSms) 
      : (sms !== undefined ? (sms === 'Yes' || sms === 'Unlimited' || sms === 'Limited') : undefined);

    const resolvedHasPhoneAlert = hasPhoneAlert !== undefined 
      ? Boolean(hasPhoneAlert) 
      : (phoneAlert !== undefined ? (phoneAlert === 'Yes') : undefined);

    await plan.update({
      ...(maxGroups !== undefined && { maxGroups: Number(maxGroups) }),
      ...(maxTracking !== undefined && { maxTracking: Number(maxTracking) }),
      ...(maxDevices !== undefined && { maxDevices: Number(maxDevices) }),
      ...(resolvedHasSms !== undefined && { hasSms: resolvedHasSms }),
      ...(resolvedHasPhoneAlert !== undefined && { hasPhoneAlert: resolvedHasPhoneAlert }),
      metadata: updatedMetadata
    });

    return res.json({ success: true, message: `Plan ${plan.name} updated successfully`, data: plan });
  } catch (err) {
    console.error("❌ Admin Update Plan Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// GET /api/admin/taxi/subscriptions - List active subscriptions & revenue
export async function adminGetSubscriptions(req: AuthRequest, res: Response) {
  try {
    let userPlans: any[] = [];
    try {
      userPlans = await db.UserPlan.findAll({
        include: [
          { model: db.User, attributes: ["id", "name", "email", "phoneNumber"] },
          { model: db.Plan, attributes: ["id", "name", "metadata"] }
        ],
        order: [["createdAt", "DESC"]]
      });
    } catch {
      userPlans = await db.UserPlan.findAll({ order: [["createdAt", "DESC"]] });
    }

    let totalRevenue = 0;
    userPlans.forEach((up: any) => {
      const price = up.Plan?.metadata?.price || up.plan?.metadata?.price || 0;
      totalRevenue += Number(price);
    });

    return res.json({
      success: true,
      data: {
        totalSubscriptions: userPlans.length,
        totalRevenue,
        subscriptions: userPlans.map((up: any) => ({
          id: up.id,
          createdAt: up.createdAt,
          user: up.User || up.user || null,
          plan: up.Plan || up.plan || null
        }))
      }
    });
  } catch (err: any) {
    console.error("❌ Admin Get Subscriptions Error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}

// GET /api/admin/taxi/referrals - List referral activity
export async function adminGetReferrals(req: AuthRequest, res: Response) {
  try {
    const referrers = await db.User.findAll({
      where: { referralCode: { [Op.ne]: null } },
      attributes: ["id", "name", "email", "referralCode", "createdAt"],
      order: [["createdAt", "DESC"]]
    });

    return res.json({ success: true, data: referrers });
  } catch (err) {
    console.error("❌ Admin Get Referrals Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// PATCH /api/admin/taxi/users/:id/ban - Ban or Unban a user
export async function adminBanUser(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { isBanned } = req.body;

    const user = await db.User.findByPk(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const metadata = { ...(user.metadata || {}), isBanned: Boolean(isBanned) };
    await user.update({ metadata });

    return res.json({
      success: true,
      message: `User ${user.email || user.name} is now ${isBanned ? "banned" : "active"}`,
      data: user
    });
  } catch (err) {
    console.error("❌ Admin Ban User Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// GET /api/admin/taxi/circles - List all family circles
export async function adminGetAllCircles(req: AuthRequest, res: Response) {
  try {
    const circles = await db.Circle.findAll({
      include: [
        { 
          model: db.User, 
          as: "members", 
          attributes: ["id", "name", "email", "phoneNumber", "latitude", "longitude", "avatar", "updatedAt"],
          through: { attributes: ["role", "createdAt"] }
        },
        {
          model: db.User,
          as: "creator",
          attributes: ["id", "name", "email", "phoneNumber", "latitude", "longitude"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });

    // Populate fallback coordinates from LocationHistory for members whose direct coordinates are null
    const memberUserIdsWithNullLoc: string[] = [];
    circles.forEach((c: any) => {
      c.members?.forEach((m: any) => {
        if (m.latitude == null || m.longitude == null) {
          memberUserIdsWithNullLoc.push(m.id);
        }
      });
    });

    if (memberUserIdsWithNullLoc.length > 0) {
      const recentLocations = await db.LocationHistory.findAll({
        where: { userId: memberUserIdsWithNullLoc },
        order: [["createdAt", "DESC"]]
      });
      const locMap: Record<string, { lat: number; lon: number }> = {};
      recentLocations.forEach((loc: any) => {
        if (!locMap[loc.userId]) {
          locMap[loc.userId] = { lat: loc.latitude, lon: loc.longitude };
        }
      });

      circles.forEach((c: any) => {
        c.members?.forEach((m: any) => {
          if ((m.latitude == null || m.longitude == null) && locMap[m.id]) {
            m.setDataValue("latitude", locMap[m.id].lat);
            m.setDataValue("longitude", locMap[m.id].lon);
          }
        });
      });
    }

    return res.json({ success: true, data: circles });
  } catch (err) {
    console.error("❌ Admin Get Circles Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// ============================================================
// ADMIN ACCOUNT MANAGEMENT
// ============================================================

// GET /api/admin/taxi/admins - List admin accounts
export async function adminGetAdmins(req: AuthRequest, res: Response) {
  try {
    const allUsers = await db.User.findAll({
      attributes: ["id", "name", "email", "phoneNumber", "emailVerified", "metadata", "createdAt"],
      order: [["createdAt", "DESC"]]
    });

    const admins = allUsers.filter(u => u.email === 'admin@servefamily.com' || (u.metadata && u.metadata.role === 'admin'));
    return res.json({ success: true, data: admins });
  } catch (err) {
    console.error("❌ Admin Get Admins Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// POST /api/admin/taxi/admins - Create a new admin account
export async function adminCreateAdmin(req: AuthRequest, res: Response) {
  try {
    const { name, email, password, phoneNumber } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email and password are required" });
    }

    const existing = await db.User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: "An account with this email already exists" });
    }

    const bcrypt = await import("bcrypt");
    const { env } = await import("../../../config/env");
    const hashedPassword = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

    const admin = await db.User.create({
      name,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      phoneNumber: phoneNumber || null,
      metadata: { role: 'admin' },
      emailVerified: true,
    });

    return res.status(201).json({
      success: true,
      message: `Admin account created for ${admin.email}`,
      data: { id: admin.id, name: admin.name, email: admin.email, createdAt: admin.createdAt }
    });
  } catch (err) {
    console.error("❌ Admin Create Admin Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// DELETE /api/admin/taxi/admins/:id - Remove an admin account
export async function adminDeleteAdmin(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const admin = await db.User.findByPk(id);
    if (!admin) return res.status(404).json({ success: false, message: "Admin not found" });
    if (admin.email === 'admin@servefamily.com') {
      return res.status(403).json({ success: false, message: "Cannot remove the primary admin account" });
    }
    await admin.destroy();
    return res.json({ success: true, message: "Admin account removed" });
  } catch (err) {
    console.error("❌ Admin Delete Admin Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// POST /api/admin/taxi/agents/:id/auto-assign - Auto-assign taxis in same district to agent
export async function adminAutoAssignDrivers(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const agent = await db.Agent.findByPk(id);
    if (!agent) return res.status(404).json({ success: false, message: "Agent not found" });

    const district = agent.district || agent.locationName;
    if (!district || district === "Regional Division") {
      return res.status(400).json({ success: false, message: "Agent has no district set for auto-assignment" });
    }

    // Match vehicles whose baseAddress contains the district name OR any sub-town of that district
    const subTowns = SL_DISTRICT_TOWNS[district] || [];
    const towns = [district, ...subTowns];
    const addressConditions = towns.map(t => ({
      baseAddress: { [Op.iLike]: `%${t}%` }
    }));

    const vehicles = await db.Vehicle.findAll({
      where: {
        agentId: null,
        [Op.or]: addressConditions
      }
    });

    if (vehicles.length === 0) {
      return res.json({ success: true, message: `No unassigned vehicles found matching ${district} district or towns`, assigned: 0 });
    }

    const vehicleIds = vehicles.map((v: any) => v.id);
    await db.Vehicle.update({ agentId: id }, { where: { id: vehicleIds } });

    return res.json({
      success: true,
      message: `${vehicles.length} vehicle(s) auto-assigned to agent ${agent.name} (${district})`,
      assigned: vehicles.length
    });
  } catch (err) {
    console.error("❌ Admin Auto-Assign Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// POST /api/admin/taxi/vehicles/register - Agent registers a new driver/vehicle in their region
export async function adminCreateVehicleByAgent(req: AuthRequest, res: Response) {
  try {
    const { 
      driverName, 
      mobileNum, 
      email, 
      vehicleTypeId, 
      vehicleRegNum, 
      color, 
      baseAddress,
      nicNumber,
      drivingLicenseNumber,
      licenseNumber,
      nicFrontUrl,
      nicBackUrl,
      drivingLicenseFrontUrl,
      licenseFrontUrl,
      drivingLicenseBackUrl,
      licenseBackUrl,
      waitingFare,
      waitingCharge,
      ratePerKm,
      baseFare,
      pickupFare,
      isWaiting
    } = req.body;
    if (!driverName || !mobileNum || !vehicleRegNum) {
      return res.status(400).json({ success: false, message: "Driver name, mobile number, and plate number are required" });
    }

    // Resolve vehicleTypeId gracefully with Sri Lankan synonym support (default to Tuk for hire)
    const resolvedVehicleTypeId = await resolveVehicleTypeId(vehicleTypeId, "hire");

    // Determine agent / approver requesting
    let agentId: string | null = null;
    let approverName = "Regional Agent";
    let agentRegion = "Regional Division";

    if (req.user?.userId) {
      const user = await db.User.findByPk(req.user.userId);
      if (user && user.email) {
        const isAdmin = user.email === 'admin@servefamily.com' || user.metadata?.role === 'admin' || user.metadata?.role === 'superadmin';
        if (isAdmin) {
          approverName = `System Admin (${user.name || 'Admin'})`;
        }

        let agent = await db.Agent.findOne({ where: { email: user.email } });
        if (!agent && !isAdmin && (user.metadata?.role === 'agent' || user.email.includes('agent'))) {
          let inferredLocation = "Regional Division";
          const emailParts = user.email.split("@")[0].split(".");
          if (emailParts.length > 1) {
            const locPart = emailParts[1].charAt(0).toUpperCase() + emailParts[1].slice(1);
            if (locPart.toLowerCase() !== "agent") inferredLocation = locPart;
          }
          try {
            agent = await db.Agent.create({
              name: user.name || "Regional Agent",
              email: user.email,
              phone: user.phoneNumber || undefined,
              locationName: inferredLocation,
              district: inferredLocation !== "Regional Division" ? inferredLocation : null,
              status: "active"
            });
          } catch (e) {}
        }

        if (agent) {
          agentId = agent.id;
          agentRegion = agent.locationName || agent.district || "Regional Division";
          if (!isAdmin) approverName = `${agent.name} (${agentRegion})`;
        }
      }
    }

    // Check duplicate plate number
    const existingVehicle = await db.Vehicle.findOne({ where: { vehicleRegNum: vehicleRegNum.trim().toUpperCase() } });
    if (existingVehicle) {
      return res.status(409).json({ success: false, message: "A vehicle with this plate number is already registered" });
    }

    // Find or create Driver User
    const cleanPlate = vehicleRegNum.toLowerCase().replace(/[^a-z0-9]/g, '');
    const driverEmail = email ? email.trim().toLowerCase() : `driver.${cleanPlate}@servefamily.com`;
    const cleanPhone = mobileNum.trim();
    const bcrypt = await import("bcrypt");
    const { env } = await import("../../../config/env");
    const hashedPassword = await bcrypt.hash("driver123", env.BCRYPT_ROUNDS);

    let driverUser = await db.User.findOne({
      where: {
        [Op.or]: [
          { email: driverEmail },
          { phoneNumber: cleanPhone }
        ]
      }
    });

    if (!driverUser) {
      driverUser = await db.User.create({
        name: driverName.trim(),
        email: driverEmail,
        phoneNumber: cleanPhone,
        password: hashedPassword,
        metadata: { role: 'driver' },
        emailVerified: true,
      });
    } else {
      const existingMeta = driverUser.metadata || {};
      const updates: any = {};
      if (!driverUser.phoneNumber) updates.phoneNumber = cleanPhone;
      if (existingMeta.role !== 'admin' && existingMeta.role !== 'superadmin' && existingMeta.role !== 'agent') {
        updates.metadata = { ...existingMeta, role: 'driver' };
      }
      if (Object.keys(updates).length > 0) {
        await driverUser.update(updates);
      }
    }

    const finalBaseAddress = baseAddress
      ? (baseAddress.toLowerCase().includes(agentRegion.toLowerCase()) ? baseAddress : `${baseAddress}, ${agentRegion}`)
      : agentRegion;

    // Resolve accurate geographic coordinates for base & live location so vehicle is immediately discoverable in nearby searches
    const coords = resolveSriLankanCoordinates(finalBaseAddress || agentRegion || baseAddress);
    const initialLat = coords.latitude;
    const initialLng = coords.longitude;

    const resolvedWaitingFare = waitingFare !== undefined && waitingFare !== null
      ? Number(waitingFare)
      : (waitingCharge !== undefined && waitingCharge !== null ? Number(waitingCharge) : 0.0);
    const initialIsWaiting = isWaiting !== undefined ? Boolean(isWaiting) : false;

    const newVehicle = await db.Vehicle.create({
      userId: driverUser.id,
      vehicleTypeId: resolvedVehicleTypeId,
      vehicleRegNum: vehicleRegNum.trim().toUpperCase(),
      color: color || "Black",
      mobileNum: mobileNum.trim(),
      showMobileNum: true,
      approvalStatus: "approved", // Directly approved by registering agent
      isActive: true,
      baseAddress: finalBaseAddress,
      baseLatitude: initialLat,
      baseLongitude: initialLng,
      latitude: initialLat,
      longitude: initialLng,
      agentId,
      ratePerKm: ratePerKm !== undefined && ratePerKm !== null ? Number(ratePerKm) : null,
      baseFare: baseFare !== undefined && baseFare !== null ? Number(baseFare) : null,
      pickupFare: pickupFare !== undefined && pickupFare !== null ? Number(pickupFare) : 0.0,
      waitingFare: resolvedWaitingFare,
      isWaiting: initialIsWaiting,
      waitingStartedAt: initialIsWaiting ? new Date() : null,
      approvedBy: approverName,
      approvedById: req.user?.userId || null,
      approvedAt: new Date(),
      approvalReason: "Directly registered and verified by Regional Agent"
    });

    // Save NIC Document
    if (nicFrontUrl || nicBackUrl || nicNumber) {
      await db.DriverDocument.create({
        userId: driverUser.id,
        documentType: "NIC",
        documentNumber: nicNumber ? nicNumber.trim() : null,
        frontUrl: nicFrontUrl || "",
        backUrl: nicBackUrl || ""
      });
    }

    // Save Driving License Document
    const finalLicenseNo = drivingLicenseNumber || licenseNumber;
    const finalLicenseFront = drivingLicenseFrontUrl || licenseFrontUrl;
    const finalLicenseBack = drivingLicenseBackUrl || licenseBackUrl;

    if (finalLicenseFront || finalLicenseBack || finalLicenseNo) {
      await db.DriverDocument.create({
        userId: driverUser.id,
        documentType: "DrivingLicense",
        documentNumber: finalLicenseNo ? finalLicenseNo.trim() : null,
        frontUrl: finalLicenseFront || "",
        backUrl: finalLicenseBack || ""
      });
    }

    return res.status(201).json({
      success: true,
      message: `Driver ${driverName} (${vehicleRegNum}) registered & approved successfully`,
      data: newVehicle
    });
  } catch (err) {
    console.error("❌ Admin Agent Create Vehicle Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// GET /api/admin/taxi/vehicle-types
export async function adminGetVehicleTypes(req: AuthRequest, res: Response) {
  try {
    const types = await db.VehicleType.findAll({
      order: [["category", "ASC"], ["type", "ASC"]]
    });
    return res.json({ success: true, data: types });
  } catch (err) {
    console.error("❌ Admin Get Vehicle Types Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// POST /api/admin/taxi/vehicle-types
export async function adminCreateVehicleType(req: AuthRequest, res: Response) {
  try {
    const { type, category, baseFare, ratePerKm, seats } = req.body;
    if (!type) {
      return res.status(400).json({ success: false, message: "Vehicle type name is required" });
    }

    const existing = await db.VehicleType.findOne({ where: { type: type.trim() } });
    if (existing) {
      return res.status(409).json({ success: false, message: "Vehicle type already exists" });
    }

    const vType = await db.VehicleType.create({
      type: type.trim(),
      category: category === "transport" ? "transport" : "hire",
      baseFare: baseFare !== undefined ? Number(baseFare) : 100,
      ratePerKm: ratePerKm !== undefined ? Number(ratePerKm) : 50,
      seats: seats !== undefined ? Number(seats) : 4
    });

    return res.status(201).json({ success: true, message: "Vehicle type created successfully", data: vType });
  } catch (err) {
    console.error("❌ Admin Create Vehicle Type Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// PATCH /api/admin/taxi/vehicle-types/:id
export async function adminUpdateVehicleType(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { type, category, baseFare, ratePerKm, seats } = req.body;

    const vType = await db.VehicleType.findByPk(id);
    if (!vType) {
      return res.status(404).json({ success: false, message: "Vehicle type not found" });
    }

    const updates: any = {};
    if (type) updates.type = type.trim();
    if (category) updates.category = category === "transport" ? "transport" : "hire";
    if (baseFare !== undefined) updates.baseFare = Number(baseFare);
    if (ratePerKm !== undefined) updates.ratePerKm = Number(ratePerKm);
    if (seats !== undefined) updates.seats = Number(seats);

    await vType.update(updates);
    return res.json({ success: true, message: "Vehicle type updated successfully", data: vType });
  } catch (err) {
    console.error("❌ Admin Update Vehicle Type Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// DELETE /api/admin/taxi/vehicle-types/:id
export async function adminDeleteVehicleType(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const vType = await db.VehicleType.findByPk(id);
    if (!vType) {
      return res.status(404).json({ success: false, message: "Vehicle type not found" });
    }

    await vType.destroy();
    return res.json({ success: true, message: "Vehicle type deleted successfully" });
  } catch (err) {
    console.error("❌ Admin Delete Vehicle Type Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// =========================================================
// HELPER: ADMIN AUDIT LOGGING
// =========================================================
export async function logAdminActivity(
  req: AuthRequest,
  action: string,
  targetEntity?: string,
  targetId?: string,
  details?: Record<string, any>
) {
  try {
    const adminId = req.user?.userId;
    let adminName = "System Admin";
    let adminEmail = "admin@servefamily.com";

    if (adminId) {
      const user = await db.User.findByPk(adminId);
      if (user) {
        adminName = user.name || adminName;
        adminEmail = user.email || adminEmail;
      }
    }

    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.ip || null;

    await db.AdminAuditLog.create({
      adminId,
      adminName,
      adminEmail,
      action,
      targetEntity: targetEntity || null,
      targetId: targetId || null,
      details: details || null,
      ipAddress
    });
  } catch (err) {
    console.error("❌ Log Admin Activity Error:", err);
  }
}

// =========================================================
// SYSTEM SETTINGS CONTROLLERS
// =========================================================

// GET /api/admin/taxi/settings
export async function adminGetSystemSettings(req: AuthRequest, res: Response) {
  try {
    const settingsList = await db.SystemSetting.findAll();
    const settingsMap: Record<string, any> = {
      platformCommissionFee: 10,
      maxSearchRadiusKm: 10,
      maintenanceMode: false,
      supportPhone: "+94770000000",
      supportEmail: "support@servefamily.com",
      soundEffectsEnabled: true
    };

    settingsList.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    return res.json({ success: true, data: settingsMap });
  } catch (err) {
    console.error("❌ Admin Get System Settings Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// PATCH /api/admin/taxi/settings
export async function adminUpdateSystemSettings(req: AuthRequest, res: Response) {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== "object") {
      return res.status(400).json({ success: false, message: "Settings object required" });
    }

    const savedKeys: string[] = [];

    for (const [key, value] of Object.entries(updates)) {
      await db.SystemSetting.upsert({
        key,
        value,
        description: `Updated by admin at ${new Date().toISOString()}`
      });
      savedKeys.push(key);
    }

    await logAdminActivity(req, "UPDATE_SYSTEM_SETTINGS", "SystemSetting", "GLOBAL", updates);

    return res.json({
      success: true,
      message: `System settings (${savedKeys.join(", ")}) updated successfully`,
      data: updates
    });
  } catch (err) {
    console.error("❌ Admin Update System Settings Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// =========================================================
// AUDIT LOGS CONTROLLER
// =========================================================

// GET /api/admin/taxi/audit-logs
export async function adminGetAuditLogs(req: AuthRequest, res: Response) {
  try {
    const { page = 1, limit = 50, action, search } = req.query;
    const where: any = {};

    if (action) where.action = action;
    if (search) {
      where[Op.or] = [
        { adminName: { [Op.iLike]: `%${search}%` } },
        { adminEmail: { [Op.iLike]: `%${search}%` } },
        { action: { [Op.iLike]: `%${search}%` } },
        { targetEntity: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (Number(page) - 1) * Number(limit);
    const logs = await db.AdminAuditLog.findAndCountAll({
      where,
      limit: Number(limit),
      offset,
      order: [["createdAt", "DESC"]]
    });

    return res.json({
      success: true,
      data: logs.rows,
      total: logs.count
    });
  } catch (err) {
    console.error("❌ Admin Get Audit Logs Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// =========================================================
// TRIPS & BOOKINGS CONTROLLERS (ADVANCED DISPATCH & MANAGEMENT)
// =========================================================

// GET /api/admin/taxi/bookings - List all bookings with live stats & server-side search
export async function adminGetAllBookings(req: AuthRequest, res: Response) {
  try {
    const { status, search, page = 1, limit = 100 } = req.query;
    const where: any = {};

    if (status && typeof status === "string" && status.trim()) {
      const cleanStatus = status.trim().toLowerCase();
      if (cleanStatus === "in_progress") {
        where.status = { [Op.in]: ["arrived", "in_transit"] };
      } else {
        where.status = cleanStatus;
      }
    }

    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim();
      where[Op.or] = [
        db.sequelize.where(
          db.sequelize.cast(db.sequelize.col("VehicleBooking.id"), "text"),
          { [Op.iLike]: `%${q}%` }
        ),
        { pickupAddress: { [Op.iLike]: `%${q}%` } },
        { dropAddress: { [Op.iLike]: `%${q}%` } },
        { "$passenger.name$": { [Op.iLike]: `%${q}%` } },
        { "$passenger.phone_number$": { [Op.iLike]: `%${q}%` } },
        { "$passenger.email$": { [Op.iLike]: `%${q}%` } },
        { "$vehicle.vehicle_reg_num$": { [Op.iLike]: `%${q}%` } },
        { "$vehicle.driver.name$": { [Op.iLike]: `%${q}%` } },
        { "$vehicle.driver.phone_number$": { [Op.iLike]: `%${q}%` } },
      ];
    }

    // Regional Agent Isolation
    const agentCtx = await getAgentContext(req.user?.userId);
    const agentOrConditions: any[] = [];
    if (!agentCtx.isAdmin && agentCtx.isAgent) {
      if (agentCtx.agentIds.length > 0) {
        agentOrConditions.push({ "$vehicle.agent_id$": { [Op.in]: agentCtx.agentIds } });
      }
      for (const kw of agentCtx.areaKeywords) {
        agentOrConditions.push({ "$vehicle.base_address$": { [Op.iLike]: `%${kw}%` } });
        agentOrConditions.push({ pickupAddress: { [Op.iLike]: `%${kw}%` } });
        agentOrConditions.push({ dropAddress: { [Op.iLike]: `%${kw}%` } });
      }
      if (agentOrConditions.length > 0) {
        where[Op.and] = [
          ...(where[Op.and] || []),
          { [Op.or]: agentOrConditions }
        ];
      }
    }

    const offset = (Number(page) - 1) * Number(limit);

    const bookings = await db.VehicleBooking.findAndCountAll({
      where,
      include: [
        { model: db.User, as: "passenger", attributes: ["id", "name", "email", "phoneNumber", "createdAt"] },
        {
          model: db.Vehicle,
          as: "vehicle",
          include: [
            { model: db.User, as: "driver", attributes: ["id", "name", "email", "phoneNumber"] },
            { model: db.VehicleType, as: "vehicleType" },
            { model: db.Agent, as: "agent" }
          ]
        },
        { model: db.Review, as: "review" }
      ],
      limit: Number(limit),
      offset,
      order: [["createdAt", "DESC"]],
      subQuery: false
    });

    // Compute live dashboard stats for Trips (scoped by agent if agentCtx.isAgent)
    const statsWhere: any = {};
    if (agentOrConditions.length > 0) {
      statsWhere[Op.or] = agentOrConditions;
    }
    const statsInclude = (!agentCtx.isAdmin && agentCtx.isAgent && agentOrConditions.length > 0)
      ? [{ model: db.Vehicle, as: "vehicle", attributes: [] }]
      : undefined;

    const [totalCount, pendingCount, acceptedCount, arrivedCount, inTransitCount, completedCount, cancelledCount] = await Promise.all([
      db.VehicleBooking.count({ where: statsWhere, include: statsInclude, distinct: true }),
      db.VehicleBooking.count({ where: { ...statsWhere, status: "pending" }, include: statsInclude, distinct: true }),
      db.VehicleBooking.count({ where: { ...statsWhere, status: "accepted" }, include: statsInclude, distinct: true }),
      db.VehicleBooking.count({ where: { ...statsWhere, status: "arrived" }, include: statsInclude, distinct: true }),
      db.VehicleBooking.count({ where: { ...statsWhere, status: "in_transit" }, include: statsInclude, distinct: true }),
      db.VehicleBooking.count({ where: { ...statsWhere, status: "completed" }, include: statsInclude, distinct: true }),
      db.VehicleBooking.count({ where: { ...statsWhere, status: "cancelled" }, include: statsInclude, distinct: true }),
    ]);

    const activeCount = acceptedCount + arrivedCount + inTransitCount;
    const completedFares = await db.VehicleBooking.findAll({
      where: { ...statsWhere, status: "completed" },
      include: statsInclude,
      attributes: ["fare", "companyCommission"]
    });
    const totalRevenue = completedFares.reduce((sum, b) => sum + (Number(b.fare) || 0), 0);
    const totalCommission = completedFares.reduce(
      (sum, b) => sum + (Number((b as any).companyCommission) || Math.round(Number(b.fare || 0) * 0.10)),
      0
    );

    return res.json({
      success: true,
      data: bookings.rows,
      total: bookings.count,
      stats: {
        total: totalCount,
        pending: pendingCount,
        active: activeCount,
        accepted: acceptedCount,
        arrived: arrivedCount,
        inTransit: inTransitCount,
        completed: completedCount,
        cancelled: cancelledCount,
        totalRevenue: Math.round(totalRevenue),
        totalCommission: Math.round(totalCommission)
      }
    });
  } catch (err) {
    console.error("❌ Admin Get Bookings Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// GET /api/admin/taxi/bookings/:id - Comprehensive in-depth details
export async function adminGetBookingDetails(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const booking = await db.VehicleBooking.findByPk(id, {
      include: [
        { model: db.User, as: "passenger", attributes: ["id", "name", "email", "phoneNumber", "createdAt"] },
        {
          model: db.Vehicle,
          as: "vehicle",
          include: [
            { model: db.User, as: "driver", attributes: ["id", "name", "email", "phoneNumber"] },
            { model: db.VehicleType, as: "vehicleType" },
            { model: db.Agent, as: "agent" }
          ]
        },
        { model: db.Review, as: "review" }
      ]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const agentCtx = await getAgentContext(req.user?.userId);
    if (!canAgentAccessBooking(agentCtx, booking)) {
      return res.status(403).json({ success: false, message: "You are not authorized to view bookings outside your assigned region." });
    }

    return res.json({ success: true, data: booking });
  } catch (err) {
    console.error("❌ Admin Get Booking Details Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// POST /api/admin/taxi/bookings/:id/cancel - Real-time cancel with socket broadcast & notifications
export async function adminCancelBooking(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const booking = await db.VehicleBooking.findByPk(id, {
      include: [
        {
          model: db.Vehicle,
          as: "vehicle",
          include: [{ model: db.User, as: "driver", attributes: ["id", "name", "phoneNumber"] }]
        }
      ]
    });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const agentCtx = await getAgentContext(req.user?.userId);
    if (!canAgentAccessBooking(agentCtx, booking)) {
      return res.status(403).json({ success: false, message: "You are not authorized to cancel bookings outside your assigned region." });
    }

    const cancellationReason = reason || "Cancelled by Super Admin / Dispatcher";
    await booking.update({
      status: "cancelled",
      cancellationReason
    });

    // Disarm auto-timeout timer
    clearBookingTimeout(id);

    // Broadcast Real-time Socket events
    try {
      const io = getIO();
      if (io) {
        const cancelPayload = {
          bookingId: id,
          status: "cancelled",
          reason: cancellationReason,
          cancellationReason,
          cancelledBy: "admin"
        };

        // 1. Tell all nearby drivers to remove this request & stop ringing
        io.to("nearby_drivers").emit("ride_request_cancelled", cancelPayload);
        io.to("nearby_drivers").emit("ride_request_taken", { bookingId: id });
        io.to("nearby_drivers").emit("ride_request_expired", cancelPayload);

        // 2. Specific driver / vehicle
        if (booking.vehicleId) {
          io.to(`driver_${booking.vehicleId}`).emit("ride_request_cancelled", cancelPayload);
          io.to(`driver_${booking.vehicleId}`).emit("ride_request_taken", { bookingId: id });
        }
        const vehicleUserId = (booking as any).vehicle?.userId;
        if (vehicleUserId) {
          io.to(`driver_${vehicleUserId}`).emit("ride_request_cancelled", cancelPayload);
          io.to(vehicleUserId).emit("ride_request_cancelled", cancelPayload);
        }

        // 3. Passenger & Active room
        io.to(`booking_${id}`).emit("ride_cancelled", cancelPayload);
        io.to(`booking_${id}`).emit("ride_status_updated", cancelPayload);
        if (booking.userId) {
          io.to(`user_${booking.userId}`).emit("ride_cancelled", cancelPayload);
          io.to(booking.userId).emit("ride_cancelled", cancelPayload);
        }

        // 4. Admin room
        io.to("admin_room").emit("ride_cancelled", cancelPayload);
        io.to("admin_room").emit("ride_status_updated", cancelPayload);
      }
    } catch (sockErr) {
      console.warn("⚠️ Admin cancel socket warning:", sockErr);
    }

    // Push Notifications
    try {
      const actorId = req.user!.userId;
      if (booking.userId) {
        await sendNotificationToUser(
          booking.userId,
          "Trip Cancelled by Admin ❌",
          `Your trip #${id.substring(0, 8)} was cancelled by dispatch. Reason: ${cancellationReason}`,
          {
            type: "TAXI_BOOKING_STATUS_UPDATE",
            bookingId: String(id),
            status: "cancelled",
            cancelledBy: "admin",
            reason: cancellationReason
          },
          actorId
        ).catch(() => {});
      }
      const vehicleUserId = (booking as any).vehicle?.userId;
      if (vehicleUserId) {
        await sendNotificationToUser(
          vehicleUserId,
          "Trip Cancelled by Admin ❌",
          `Trip #${id.substring(0, 8)} was cancelled by dispatch. Reason: ${cancellationReason}`,
          {
            type: "TAXI_BOOKING_STATUS_UPDATE",
            bookingId: String(id),
            status: "cancelled",
            cancelledBy: "admin",
            reason: cancellationReason
          },
          actorId
        ).catch(() => {});
      }
    } catch (notifErr) {
      console.warn("⚠️ Admin cancel notification warning:", notifErr);
    }

    await logAdminActivity(req, "CANCEL_BOOKING", "VehicleBooking", id, { reason: cancellationReason });

    return res.json({ success: true, message: "Booking cancelled successfully by Admin", data: booking });
  } catch (err) {
    console.error("❌ Admin Cancel Booking Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// PATCH /api/admin/taxi/bookings/:id/status - Admin update booking status
export async function adminUpdateBookingStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    let { status, cancellationReason, reason } = req.body; // 'pending', 'accepted', 'arrived', 'in_transit', 'completed', 'cancelled'

    if (status === "started" || status === "ongoing") {
      status = "in_transit";
    }

    const booking = await db.VehicleBooking.findByPk(id, {
      include: [
        {
          model: db.Vehicle,
          as: "vehicle",
          include: [
            { model: db.VehicleType, as: "vehicleType" },
            { model: db.User, as: "driver", attributes: ["id", "name", "email", "phoneNumber", "avatar"] }
          ]
        },
        {
          model: db.User,
          as: "passenger",
          attributes: ["id", "name", "email", "phoneNumber", "avatar"]
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const agentCtx = await getAgentContext(req.user?.userId);
    if (!canAgentAccessBooking(agentCtx, booking)) {
      return res.status(403).json({ success: false, message: "You are not authorized to update bookings outside your assigned region." });
    }

    let companyCommission = (booking as any).companyCommission || 0;
    let driverEarnings = (booking as any).driverEarnings || 0;
    let paymentStatus = (booking as any).paymentStatus || "pending";
    let finalBill: any = null;

    if (status === "completed") {
      const vehicle = (booking as any).vehicle;
      const vehicleType = vehicle?.vehicleType;

      const vBaseFare = Number(vehicle?.baseFare) || Number(vehicleType?.baseFare) || 100;
      const vRatePerKm = Number(vehicle?.ratePerKm) || Number(vehicleType?.ratePerKm) || 80;
      const vPickupFare = Number(vehicle?.pickupFare) || 0;
      const vWaitingRate = Number(vehicle?.waitingFare) || 10;

      let actualDistance = Number(booking.distance) || 0;
      const bodyDistance = req.body.actualDistance ?? req.body.distance ?? req.body.distanceKm;
      if (bodyDistance !== undefined && bodyDistance !== null && !isNaN(Number(bodyDistance)) && Number(bodyDistance) > 0) {
        actualDistance = Math.round(Number(bodyDistance) * 10) / 10;
      }

      let finalWaitingMinutes = Number(booking.waitingMinutes) || 0;
      if (booking.isWaiting && booking.waitingStartedAt) {
        const elapsedMinutes = Math.max(0, Math.round(((Date.now() - new Date(booking.waitingStartedAt).getTime()) / 60000) * 10) / 10);
        finalWaitingMinutes = Math.round((finalWaitingMinutes + elapsedMinutes) * 10) / 10;
      }
      const finalWaitingFare = Math.round(finalWaitingMinutes * vWaitingRate);
      const distanceFare = Math.round(actualDistance * vRatePerKm);

      const initialBookedFare = Number(booking.fare) || 0;
      const calculatedFare = Math.round(vBaseFare + distanceFare + vPickupFare + finalWaitingFare);
      let finalFare = Math.max(calculatedFare, Math.round(initialBookedFare + finalWaitingFare));
      if (finalFare <= 0) finalFare = Math.max(vBaseFare, 100);

      let commissionRate = 0.10; // Default 10% platform commission
      try {
        const commSetting = await db.SystemSetting.findOne({ where: { key: "platformCommissionFee" } });
        if (commSetting && commSetting.value !== undefined && commSetting.value !== null && !isNaN(Number(commSetting.value))) {
          commissionRate = Math.max(0, Math.min(100, Number(commSetting.value))) / 100;
        }
      } catch (_) {}

      companyCommission = Math.round(finalFare * commissionRate);
      driverEarnings = Math.round(finalFare - companyCommission);
      paymentStatus = "paid";

      await booking.update({
        status,
        distance: actualDistance,
        fare: finalFare,
        waitingMinutes: finalWaitingMinutes,
        waitingFare: finalWaitingFare,
        isWaiting: false,
        waitingStartedAt: null,
        companyCommission,
        driverEarnings,
        paymentStatus
      });

      // Reset driver vehicle waiting mode so it does not persist across future trips
      if (vehicle) {
        await vehicle.update({ isWaiting: false, waitingStartedAt: null }).catch(() => {});
      }

      finalBill = buildBookingReceipt(booking);
      finalBill.distanceKm = actualDistance;
      finalBill.baseFare = Math.round(vBaseFare);
      finalBill.ratePerKm = Math.round(vRatePerKm);
      finalBill.pickupFare = Math.round(vPickupFare);
      finalBill.distanceFare = distanceFare;
      finalBill.waitingMinutes = finalWaitingMinutes;
      finalBill.waitingRatePerMin = vWaitingRate;
      finalBill.waitingFare = finalWaitingFare;
      finalBill.subTotal = finalFare;
      finalBill.totalFare = finalFare;
      finalBill.companyCommission = companyCommission;
      finalBill.driverEarnings = driverEarnings;
    } else if (status === "cancelled") {
      clearBookingTimeout(id);
      const finalReason = cancellationReason || reason || "Cancelled by Super Admin / Dispatcher";
      await booking.update({ status: "cancelled", cancellationReason: finalReason });
    } else {
      if (status === "accepted") {
        clearBookingTimeout(id);
      }
      await booking.update({ status });
    }

    // Real-Time Socket.io Broadcast
    try {
      const io = getIO();
      if (io) {
        const payload = {
          bookingId: id,
          status,
          fare: booking.fare,
          paymentStatus,
          driverEarnings,
          companyCommission,
          cancellationReason: (booking as any).cancellationReason,
          bill: finalBill || undefined,
          updatedAt: new Date().toISOString(),
        };

        io.to(`booking_${id}`).emit("ride_status_updated", payload);
        io.to("admin_room").emit("ride_status_updated", payload);

        if (status === "completed") {
          io.to(`booking_${id}`).emit("ride_completed", payload);
          io.to("admin_room").emit("ride_completed", payload);
        } else if (status === "cancelled") {
          io.to(`booking_${id}`).emit("ride_cancelled", payload);
          io.to("admin_room").emit("ride_cancelled", payload);
          io.to("nearby_drivers").emit("ride_request_cancelled", payload);
          io.to("nearby_drivers").emit("ride_request_taken", { bookingId: id });
        }
      }
    } catch (sockErr) {
      console.warn("⚠️ Admin update status socket warning:", sockErr);
    }

    // Push notification to passenger & driver
    try {
      const actorId = req.user!.userId;
      const passengerUserId = booking.userId;
      const vehicleUserId = (booking as any).vehicle?.userId;

      if (passengerUserId) {
        await sendNotificationToUser(
          passengerUserId,
          `Trip Status: ${status.toUpperCase()} 🚕`,
          `Your trip status has been updated to "${status}" by dispatch.`,
          {
            type: "TAXI_BOOKING_STATUS_UPDATE",
            bookingId: String(id),
            status
          },
          actorId
        ).catch(() => {});
      }
      if (vehicleUserId) {
        await sendNotificationToUser(
          vehicleUserId,
          `Trip Status: ${status.toUpperCase()} 🚕`,
          `Trip status for booking #${id.substring(0, 8)} has been updated to "${status}" by dispatch.`,
          {
            type: "TAXI_BOOKING_STATUS_UPDATE",
            bookingId: String(id),
            status
          },
          actorId
        ).catch(() => {});
      }
    } catch (notifErr) {
      console.warn("⚠️ Admin status notification warning:", notifErr);
    }

    if (status === "completed") {
      try {
        let passengerEmail = (booking as any).passenger?.email;
        let passengerName = (booking as any).passenger?.name;
        const pUserId = booking.userId;
        if (!passengerEmail && pUserId) {
          const u = await db.User.findByPk(pUserId, { attributes: ["email", "name"] });
          if (u) {
            passengerEmail = u.email;
            if (!passengerName) passengerName = u.name;
          }
        }
        if (passengerEmail) {
          const vehicle = (booking as any).vehicle;
          const { sendRideReceiptEmail } = await import("../../../services/emailService");
          sendRideReceiptEmail({
            toEmail: passengerEmail,
            passengerName: passengerName || "Valued Rider",
            invoiceNo: finalBill?.invoiceNo || `INV-${String(booking.id).substring(0, 8).toUpperCase()}`,
            bookingId: String(booking.id),
            date: booking.createdAt,
            completedAt: booking.updatedAt,
            pickupAddress: booking.pickupAddress || `${booking.pickupLat}, ${booking.pickupLng}`,
            dropoffAddress: booking.dropAddress || `${booking.dropLat}, ${booking.dropLng}`,
            distanceKm: finalBill?.distanceKm ?? Number(booking.distance) ?? 0,
            driverName: vehicle?.driver?.name || "Serve Family Driver",
            driverPhone: vehicle?.driver?.phoneNumber || vehicle?.mobileNum || "",
            vehicleRegNum: vehicle?.vehicleRegNum || "Taxi",
            vehicleType: vehicle?.vehicleType?.type || "Standard",
            paymentMethod: booking.paymentMethod || "cash",
            paymentStatus: "paid",
            baseFare: finalBill?.baseFare || 100,
            ratePerKm: finalBill?.ratePerKm || 80,
            distanceFare: finalBill?.distanceFare || 0,
            pickupFare: finalBill?.pickupFare || 0,
            waitingMinutes: finalBill?.waitingMinutes || 0,
            waitingFare: finalBill?.waitingFare || 0,
            totalFare: Number(booking.fare) || finalBill?.totalFare || 0
          }).catch(e => console.warn("Background receipt email error from admin:", e));
        }
      } catch (e) {
        console.warn("Could not send admin completion receipt email:", e);
      }
    }

    await logAdminActivity(req, "UPDATE_BOOKING_STATUS", "VehicleBooking", id, { status });

    if (status === "completed") {
      return res.json({
        success: true,
        message: `Booking status updated to ${status} successfully`,
        status: "completed",
        bill: finalBill,
        data: booking
      });
    }

    return res.json({ success: true, message: `Booking status updated to ${status} successfully`, data: booking });
  } catch (err) {
    console.error("❌ Admin Update Booking Status Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// PATCH /api/admin/taxi/bookings/:id/reassign - Admin reassign booking to approved driver
export async function adminReassignBooking(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { vehicleId, unassign } = req.body;

    const booking = await db.VehicleBooking.findByPk(id, {
      include: [
        { model: db.User, as: "passenger", attributes: ["id", "name", "email", "phoneNumber"] },
        { model: db.Vehicle, as: "vehicle" }
      ]
    });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const agentCtx = await getAgentContext(req.user?.userId);
    if (!canAgentAccessBooking(agentCtx, booking)) {
      return res.status(403).json({ success: false, message: "You are not authorized to reassign bookings outside your assigned region." });
    }

    const previousVehicleId = booking.vehicleId;

    if (unassign === true || (!vehicleId && vehicleId !== undefined)) {
      // Unassign driver and broadcast to nearby drivers as pending
      await booking.update({ vehicleId: null, status: "pending" });

      const io = getIO();
      if (io) {
        const socketPayload = {
          bookingId: booking.id,
          pickupLat: booking.pickupLat,
          pickupLng: booking.pickupLng,
          pickupAddress: booking.pickupAddress,
          dropLat: booking.dropLat,
          dropLng: booking.dropLng,
          dropAddress: booking.dropAddress,
          distance: booking.distance,
          fare: booking.fare,
          passengerId: booking.userId,
          createdAt: booking.createdAt,
        };
        io.to("nearby_drivers").emit("new_ride_request", socketPayload);
        io.to(`booking_${id}`).emit("ride_status_updated", { bookingId: id, status: "pending", vehicleId: null });
        io.to("admin_room").emit("ride_status_updated", { bookingId: id, status: "pending", vehicleId: null });
      }

      // Re-schedule 45s timeout
      scheduleBookingTimeout(booking.id, null, 45000);

      await logAdminActivity(req, "UNASSIGN_BOOKING", "VehicleBooking", id, { previousVehicleId });

      return res.json({ success: true, message: "Booking unassigned and re-broadcast to nearby drivers", data: booking });
    }

    // Reassign to specific vehicle
    const targetVehicle = await db.Vehicle.findByPk(vehicleId, {
      include: [
        { model: db.User, as: "driver", attributes: ["id", "name", "email", "phoneNumber"] },
        { model: db.VehicleType, as: "vehicleType" }
      ]
    });

    if (!targetVehicle) {
      return res.status(404).json({ success: false, message: "Target driver / vehicle not found" });
    }

    if (targetVehicle.approvalStatus !== "approved") {
      return res.status(400).json({ success: false, message: "Cannot assign to an unapproved or suspended vehicle" });
    }

    if (!agentCtx.isAdmin && agentCtx.isAgent) {
      const vAgentId = targetVehicle.agentId;
      const vBase = (targetVehicle.baseAddress || "").toLowerCase();
      const matchesTarget = (vAgentId && agentCtx.agentIds.includes(vAgentId)) ||
        agentCtx.areaKeywords.some(kw => vBase.includes(kw.toLowerCase()));
      if (!matchesTarget) {
        return res.status(403).json({ success: false, message: "Target driver is outside your assigned region." });
      }
    }

    await booking.update({
      vehicleId: targetVehicle.id,
      status: "accepted"
    });

    // Disarm timeout
    clearBookingTimeout(id);

    const driverContact = {
      driverName: targetVehicle.driver?.name,
      phoneNumber: targetVehicle.mobileNum || targetVehicle.driver?.phoneNumber,
      vehicleRegNum: targetVehicle.vehicleRegNum,
      color: targetVehicle.color,
      latitude: targetVehicle.latitude,
      longitude: targetVehicle.longitude,
    };

    // Socket broadcasts
    try {
      const io = getIO();
      if (io) {
        // 1. Tell other nearby drivers ride is taken
        io.to("nearby_drivers").emit("ride_request_taken", { bookingId: id });

        // 2. Dispatch to the newly assigned driver
        const socketPayload = {
          bookingId: booking.id,
          pickupLat: booking.pickupLat,
          pickupLng: booking.pickupLng,
          pickupAddress: booking.pickupAddress,
          dropLat: booking.dropLat,
          dropLng: booking.dropLng,
          dropAddress: booking.dropAddress,
          distance: booking.distance,
          fare: booking.fare,
          passengerId: booking.userId,
          status: "accepted",
          assignedByAdmin: true
        };
        io.to(`driver_${targetVehicle.id}`).emit("new_ride_request", socketPayload);
        if (targetVehicle.userId) {
          io.to(`driver_${targetVehicle.userId}`).emit("new_ride_request", socketPayload);
          io.to(targetVehicle.userId).emit("new_ride_request", socketPayload);
        }

        // 3. Notify passenger
        io.to(`booking_${id}`).emit("ride_accepted", {
          bookingId: id,
          status: "accepted",
          contact: driverContact,
          vehicle: {
            id: targetVehicle.id,
            latitude: targetVehicle.latitude,
            longitude: targetVehicle.longitude
          }
        });

        // 4. Notify admin room
        io.to("admin_room").emit("ride_status_updated", {
          bookingId: id,
          status: "accepted",
          vehicleId: targetVehicle.id,
          driverName: targetVehicle.driver?.name,
          vehicleRegNum: targetVehicle.vehicleRegNum
        });
      }
    } catch (sockErr) {
      console.warn("⚠️ Admin reassign socket warning:", sockErr);
    }

    // Push notifications
    try {
      const actorId = req.user!.userId;
      if (targetVehicle.userId) {
        await sendNotificationToUser(
          targetVehicle.userId,
          "Ride Assigned by Dispatch! 🚕",
          `You have been assigned to trip #${id.substring(0, 8)} from ${booking.pickupAddress}.`,
          {
            type: "TAXI_BOOKING_REQUEST",
            bookingId: String(id),
            pickupAddress: booking.pickupAddress,
            dropAddress: booking.dropAddress,
            fare: String(booking.fare),
            distance: String(booking.distance)
          },
          actorId
        ).catch(() => {});
      }
      if (booking.userId) {
        await sendNotificationToUser(
          booking.userId,
          "Driver Assigned by Dispatch! 🚕",
          `Driver ${driverContact.driverName || "assigned"} has been assigned to your ride request.`,
          {
            type: "TAXI_BOOKING_ACCEPTED",
            bookingId: String(id),
            driverName: String(driverContact.driverName || ""),
            driverPhone: String(driverContact.phoneNumber || ""),
            vehicleRegNum: String(driverContact.vehicleRegNum || "")
          },
          actorId
        ).catch(() => {});
      }
    } catch (notifErr) {
      console.warn("⚠️ Admin reassign notification warning:", notifErr);
    }

    await logAdminActivity(req, "REASSIGN_BOOKING", "VehicleBooking", id, {
      previousVehicleId,
      newVehicleId: targetVehicle.id,
      driverName: targetVehicle.driver?.name,
      vehicleRegNum: targetVehicle.vehicleRegNum
    });

    const updatedBooking = await db.VehicleBooking.findByPk(id, {
      include: [
        { model: db.User, as: "passenger", attributes: ["id", "name", "email", "phoneNumber"] },
        {
          model: db.Vehicle,
          as: "vehicle",
          include: [
            { model: db.User, as: "driver", attributes: ["id", "name", "email", "phoneNumber"] },
            { model: db.VehicleType, as: "vehicleType" }
          ]
        }
      ]
    });

    return res.json({
      success: true,
      message: `Booking successfully reassigned to ${targetVehicle.driver?.name || "Driver"} (${targetVehicle.vehicleRegNum})`,
      data: updatedBooking
    });
  } catch (err) {
    console.error("❌ Admin Reassign Booking Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// PATCH /api/admin/taxi/bookings/:id - Admin edit booking details (fare, payment, addresses)
export async function adminUpdateBookingDetails(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { fare, paymentStatus, paymentMethod, pickupAddress, dropAddress, distance, cancellationReason } = req.body;

    const booking = await db.VehicleBooking.findByPk(id, {
      include: [{ model: db.Vehicle, as: "vehicle" }]
    });
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const agentCtx = await getAgentContext(req.user?.userId);
    if (!canAgentAccessBooking(agentCtx, booking)) {
      return res.status(403).json({ success: false, message: "You are not authorized to update bookings outside your assigned region." });
    }

    const updates: any = {};
    if (fare !== undefined && !isNaN(Number(fare))) {
      updates.fare = Number(fare);
      if (booking.status === "completed") {
        updates.companyCommission = Math.round(Number(fare) * 0.10);
        updates.driverEarnings = Math.round(Number(fare) - updates.companyCommission);
      }
    }
    if (paymentStatus !== undefined) updates.paymentStatus = paymentStatus;
    if (paymentMethod !== undefined) updates.paymentMethod = paymentMethod;
    if (pickupAddress !== undefined) updates.pickupAddress = pickupAddress;
    if (dropAddress !== undefined) updates.dropAddress = dropAddress;
    if (distance !== undefined && !isNaN(Number(distance))) updates.distance = Number(distance);
    if (cancellationReason !== undefined) updates.cancellationReason = cancellationReason;

    await booking.update(updates);

    try {
      getIO()?.to(`booking_${id}`).emit("ride_status_updated", { bookingId: id, ...updates });
      getIO()?.to("admin_room").emit("ride_status_updated", { bookingId: id, ...updates });
    } catch (_) {}

    await logAdminActivity(req, "UPDATE_BOOKING_DETAILS", "VehicleBooking", id, updates);

    return res.json({ success: true, message: "Booking details updated successfully", data: booking });
  } catch (err) {
    console.error("❌ Admin Update Booking Details Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// =========================================================
// WALLETS & COMMISSION CONTROLLER
// =========================================================

// GET /api/admin/taxi/wallets
export async function adminGetWalletsAndEarnings(req: AuthRequest, res: Response) {
  try {
    const vehicles = await db.Vehicle.findAll({
      include: [
        { model: db.User, as: "driver", attributes: ["id", "name", "email", "phoneNumber"] },
        { model: db.VehicleType, as: "vehicleType", attributes: ["type"] }
      ]
    });

    // Compute wallet stats per driver
    const driverWallets = await Promise.all(
      vehicles.map(async (v) => {
        const completedBookings = await db.VehicleBooking.findAll({
          where: { vehicleId: v.id, status: "completed" }
        });

        const totalRides = completedBookings.length;
        const totalGrossEarnings = completedBookings.reduce((sum, b) => sum + (Number(b.fare) || 0), 0);
        const platformCommissionCollected = completedBookings.reduce(
          (sum, b) => sum + (b.companyCommission !== null && b.companyCommission !== undefined ? Number(b.companyCommission) : Math.round(Number(b.fare || 0) * 0.10)),
          0
        );
        const driverNetEarnings = completedBookings.reduce(
          (sum, b) => sum + (b.driverEarnings !== null && b.driverEarnings !== undefined ? Number(b.driverEarnings) : (Number(b.fare || 0) - Math.round(Number(b.fare || 0) * 0.10))),
          0
        );

        return {
          vehicleId: v.id,
          driverId: v.userId,
          driverName: v.driver?.name || "Unknown Driver",
          driverPhone: v.mobileNum || v.driver?.phoneNumber || "—",
          plateNumber: v.vehicleRegNum,
          vehicleType: v.vehicleType?.type || "Vehicle",
          totalRides,
          grossEarnings: totalGrossEarnings,
          platformCommission: platformCommissionCollected,
          netEarnings: driverNetEarnings,
          payoutStatus: "settled"
        };
      })
    );

    const grandTotalGross = driverWallets.reduce((s, w) => s + w.grossEarnings, 0);
    const grandTotalCommission = driverWallets.reduce((s, w) => s + w.platformCommission, 0);

    return res.json({
      success: true,
      summary: {
        totalDrivers: driverWallets.length,
        totalGrossEarnings: grandTotalGross,
        totalPlatformCommission: grandTotalCommission
      },
      data: driverWallets
    });
  } catch (err) {
    console.error("❌ Admin Get Wallets Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// =========================================================
// BROADCAST PUSH & SMS CONTROLLER
// =========================================================

// POST /api/admin/taxi/notifications/broadcast
export async function adminSendBroadcastNotification(req: AuthRequest, res: Response) {
  try {
    const { title, message, targetAudience = "all", sendPush = true, sendSMS = false } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: "Title and message are required" });
    }

    let targetUserIds: string[] = [];
    const vehicles = await db.Vehicle.findAll({ attributes: ["userId"] });
    const driverUserIds = new Set(vehicles.map((v: any) => v.userId).filter(Boolean));

    if (targetAudience === "drivers") {
      targetUserIds = Array.from(driverUserIds);
    } else if (targetAudience === "passengers") {
      const allUsers = await db.User.findAll({ attributes: ["id"] });
      targetUserIds = allUsers.map((u: any) => u.id).filter(id => !driverUserIds.has(id));
    } else {
      // "all"
      const allUsers = await db.User.findAll({ attributes: ["id"] });
      targetUserIds = allUsers.map((u: any) => u.id);
    }

    if (targetUserIds.length === 0) {
      return res.json({
        success: true,
        message: "No users found matching the selected audience",
        summary: { recipientCount: 0, pushSentCount: 0, smsSentCount: 0 }
      });
    }

    const users = await db.User.findAll({
      where: { id: targetUserIds },
      attributes: ["id", "phoneNumber", "name"]
    });

    const recipientCount = users.length;
    let pushSentCount = 0;
    let smsSentCount = 0;

    // 1. Send Push Notification via Firebase (FCM) & create in-app notifications
    if (sendPush) {
      const { sendNotificationToUser } = await import("../../../notifications/fcm-service");
      for (const u of users) {
        try {
          await sendNotificationToUser(
            u.id,
            title,
            message,
            { type: "BROADCAST", title, message, targetAudience },
            req.user?.userId
          );
          pushSentCount++;
        } catch (pushErr) {
          console.warn(`[Broadcast] Push send failed for user ${u.id}:`, pushErr);
        }
      }
    }

    // 2. Send SMS via SMSLenz if enabled
    if (sendSMS && env.SMSLENZ_API_KEY && env.SMSLENZ_USER_ID) {
      const { sendOTPSMS } = await import("../../../services/smsService");
      for (const u of users) {
        if (u.phoneNumber) {
          try {
            await sendOTPSMS(u.phoneNumber, `${title}: ${message}`);
            smsSentCount++;
          } catch (smsErr) {
            console.warn(`[Broadcast] SMS send failed for ${u.phoneNumber}:`, smsErr);
          }
        }
      }
    }

    await logAdminActivity(req, "SEND_BROADCAST_NOTIFICATION", "Notification", String(targetAudience).toUpperCase(), {
      title,
      message,
      targetAudience,
      recipientCount,
      sendPush,
      pushSentCount,
      sendSMS,
      smsSentCount
    });

    return res.json({
      success: true,
      message: `Broadcast message dispatched to ${recipientCount} users (${pushSentCount} push alerts queued, ${smsSentCount} SMS sent)`,
      summary: { recipientCount, pushSentCount, smsSentCount }
    });
  } catch (err) {
    console.error("❌ Admin Broadcast Notification Error:", err);
    return res.status(500).json({ success: false, message: "Server error during broadcast" });
  }
}

// GET /api/admin/taxi/audience-counts
export async function adminGetAudienceCounts(req: AuthRequest, res: Response) {
  try {
    const totalUsers = await db.User.count();
    const vehicles = await db.Vehicle.findAll({ attributes: ["userId"] });
    const distinctDriverIds = new Set(vehicles.map((v: any) => v.userId).filter(Boolean));
    const totalDrivers = distinctDriverIds.size;
    const totalPassengers = Math.max(0, totalUsers - totalDrivers);

    return res.json({
      success: true,
      data: {
        all: totalUsers,
        drivers: totalDrivers,
        passengers: totalPassengers
      }
    });
  } catch (err) {
    console.error("❌ Admin Get Audience Counts Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// DELETE /api/admin/taxi/vehicles/:id
export async function adminDeleteVehicle(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const vehicle = await db.Vehicle.findByPk(id, {
      include: [{ model: db.User, as: "driver" }]
    });

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Driver/Vehicle not found" });
    }

    const driverName = (vehicle as any).driver?.name || vehicle.vehicleRegNum;
    const userId = vehicle.userId;

    // Delete associated driver documents
    if (userId) {
      await db.DriverDocument.destroy({ where: { userId } });
    }

    // Delete vehicle images
    await db.VehicleImage.destroy({ where: { vehicleId: id } });

    // Delete vehicle record
    await vehicle.destroy();

    await logAdminActivity(req, "DELETE_DRIVER_VEHICLE", "Vehicle", id, { driverName, vehicleRegNum: vehicle.vehicleRegNum });

    return res.json({ success: true, message: `Driver & Vehicle (${driverName}) deleted successfully` });
  } catch (err) {
    console.error("❌ Admin Delete Vehicle Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// PATCH /api/admin/taxi/vehicles/:id
export async function adminUpdateVehicleAndDriver(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const {
      driverName,
      mobileNum,
      email,
      vehicleRegNum,
      color,
      vehicleTypeId,
      baseAddress,
      nicNumber,
      nicFrontUrl,
      nicBackUrl,
      licenseNumber,
      licenseFrontUrl,
      licenseBackUrl,
      waitingFare,
      waitingCharge,
      isWaiting,
      ratePerKm,
      baseFare,
      pickupFare,
      isActive,
      isOnline
    } = req.body;

    const vehicle = await db.Vehicle.findByPk(id, {
      include: [{ model: db.User, as: "driver" }]
    });

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Driver/Vehicle not found" });
    }

    // Update Vehicle properties
    const vehicleUpdates: any = {};
    if (vehicleRegNum) vehicleUpdates.vehicleRegNum = vehicleRegNum.trim().toUpperCase();
    if (color) vehicleUpdates.color = color.trim();
    if (mobileNum) vehicleUpdates.mobileNum = mobileNum.trim();
    if (baseAddress !== undefined) {
      vehicleUpdates.baseAddress = baseAddress ? baseAddress.trim() : null;
      if (baseAddress) {
        const coords = resolveSriLankanCoordinates(baseAddress);
        vehicleUpdates.baseLatitude = coords.latitude;
        vehicleUpdates.baseLongitude = coords.longitude;
        if (!vehicle.latitude || !vehicle.longitude) {
          vehicleUpdates.latitude = coords.latitude;
          vehicleUpdates.longitude = coords.longitude;
        }
      }
    }
    if (vehicleTypeId) {
      vehicleUpdates.vehicleTypeId = await resolveVehicleTypeId(vehicleTypeId, "hire");
    }
    if (ratePerKm !== undefined) vehicleUpdates.ratePerKm = Number(ratePerKm);
    if (baseFare !== undefined) vehicleUpdates.baseFare = Number(baseFare);
    if (pickupFare !== undefined) vehicleUpdates.pickupFare = Number(pickupFare);
    if (waitingFare !== undefined) vehicleUpdates.waitingFare = Number(waitingFare);
    else if (waitingCharge !== undefined) vehicleUpdates.waitingFare = Number(waitingCharge);
    if (isWaiting !== undefined) {
      vehicleUpdates.isWaiting = Boolean(isWaiting);
      vehicleUpdates.waitingStartedAt = vehicleUpdates.isWaiting ? new Date() : null;
    }
    if (isActive !== undefined || isOnline !== undefined) {
      vehicleUpdates.isActive = Boolean(isActive !== undefined ? isActive : isOnline);
    }

    await vehicle.update(vehicleUpdates);

    // Update Driver User profile
    if (vehicle.userId) {
      const userUpdates: any = {};
      if (driverName) userUpdates.name = driverName.trim();
      if (mobileNum) userUpdates.phoneNumber = mobileNum.trim();
      if (email) userUpdates.email = email.trim().toLowerCase();

      if (Object.keys(userUpdates).length > 0) {
        await db.User.update(userUpdates, { where: { id: vehicle.userId } });
      }

      // Upsert NIC Document
      if (nicNumber || nicFrontUrl || nicBackUrl) {
        const [nicDoc] = await db.DriverDocument.findOrCreate({
          where: { userId: vehicle.userId, documentType: "NIC" },
          defaults: {
            userId: vehicle.userId,
            documentType: "NIC",
            documentNumber: nicNumber ? nicNumber.trim() : null,
            frontUrl: nicFrontUrl || "",
            backUrl: nicBackUrl || ""
          }
        });

        const nicUpdates: any = {};
        if (nicNumber !== undefined) nicUpdates.documentNumber = nicNumber ? nicNumber.trim() : null;
        if (nicFrontUrl !== undefined) nicUpdates.frontUrl = nicFrontUrl;
        if (nicBackUrl !== undefined) nicUpdates.backUrl = nicBackUrl;
        if (Object.keys(nicUpdates).length > 0) {
          await nicDoc.update(nicUpdates);
        }
      }

      // Upsert Driving License Document
      if (licenseNumber || licenseFrontUrl || licenseBackUrl) {
        const [licDoc] = await db.DriverDocument.findOrCreate({
          where: { userId: vehicle.userId, documentType: "DrivingLicense" },
          defaults: {
            userId: vehicle.userId,
            documentType: "DrivingLicense",
            documentNumber: licenseNumber ? licenseNumber.trim() : null,
            frontUrl: licenseFrontUrl || "",
            backUrl: licenseBackUrl || ""
          }
        });

        const licUpdates: any = {};
        if (licenseNumber !== undefined) licUpdates.documentNumber = licenseNumber ? licenseNumber.trim() : null;
        if (licenseFrontUrl !== undefined) licUpdates.frontUrl = licenseFrontUrl;
        if (licenseBackUrl !== undefined) licUpdates.backUrl = licenseBackUrl;
        if (Object.keys(licUpdates).length > 0) {
          await licDoc.update(licUpdates);
        }
      }
    }

    await logAdminActivity(req, "UPDATE_DRIVER_AND_DOCS", "Vehicle", id, req.body);

    const updatedVehicle = await db.Vehicle.findByPk(id, {
      include: [
        {
          model: db.User,
          as: "driver",
          include: [{ model: db.DriverDocument, as: "documents" }]
        },
        { model: db.VehicleType, as: "vehicleType" }
      ]
    });

    return res.json({
      success: true,
      message: "Driver profile and document details updated successfully",
      data: updatedVehicle
    });
  } catch (err) {
    console.error("❌ Admin Update Vehicle & Driver Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// PATCH /api/admin/taxi/vehicles/:id/waiting - Dedicated API for Agent/Admin to toggle or update waiting settings
export async function adminUpdateVehicleWaiting(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    let { isWaiting, waitingFare, waitingCharge, toggle } = req.body;

    const vehicle = await db.Vehicle.findByPk(id, {
      include: [{ model: db.User, as: "driver" }]
    });

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    if (toggle === true || (isWaiting === undefined && waitingFare === undefined && waitingCharge === undefined)) {
      isWaiting = !vehicle.isWaiting;
    }

    const updates: any = {};
    if (isWaiting !== undefined) {
      const newStatus = Boolean(isWaiting);
      updates.isWaiting = newStatus;
      updates.waitingStartedAt = newStatus ? new Date() : null;
    }

    if (waitingFare !== undefined && waitingFare !== null) {
      updates.waitingFare = Number(waitingFare);
    } else if (waitingCharge !== undefined && waitingCharge !== null) {
      updates.waitingFare = Number(waitingCharge);
    }

    await vehicle.update(updates);

    await logAdminActivity(req, "UPDATE_VEHICLE_WAITING", "Vehicle", id, {
      isWaiting: vehicle.isWaiting,
      waitingFare: vehicle.waitingFare,
      vehicleRegNum: vehicle.vehicleRegNum
    });

    return res.json({
      success: true,
      message: updates.isWaiting !== undefined 
        ? `Vehicle waiting mode turned ${vehicle.isWaiting ? "ON" : "OFF"}` 
        : "Vehicle waiting charge updated successfully",
      data: vehicle
    });
  } catch (err) {
    console.error("❌ Admin Update Vehicle Waiting Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}

// POST /api/admin/taxi/upload-document - Upload driver/vehicle verification documents or photos
export async function adminUploadDocument(req: any, res: Response) {
  try {
    const file = req.file;
    if (!file) {
      const { base64 } = req.body || {};
      if (base64 && typeof base64 === 'string') {
        const matches = base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        let ext = 'jpg';
        let rawData = base64;
        if (matches) {
          const mime = matches[1].toLowerCase();
          if (mime.includes('png')) ext = 'png';
          else if (mime.includes('webp')) ext = 'webp';
          else if (mime.includes('pdf')) ext = 'pdf';
          rawData = matches[2];
        }
        const buffer = Buffer.from(rawData, 'base64');
        const fileName = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
        const path = await import("path");
        const fs = await import("fs");
        const uploadsDir = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        fs.writeFileSync(path.join(uploadsDir, fileName), buffer);

        return res.json({
          success: true,
          message: "Document uploaded successfully",
          url: `/uploads/${fileName}`,
          filename: fileName
        });
      }
      return res.status(400).json({ success: false, message: "No file or image data provided" });
    }

    return res.json({
      success: true,
      message: "Document uploaded successfully",
      url: `/uploads/${file.filename}`,
      filename: file.filename
    });
  } catch (err) {
    console.error("❌ Admin Document Upload Error:", err);
    return res.status(500).json({ success: false, message: "Failed to upload document" });
  }
}

// =========================================================
// SRI LANKA COVERAGE ZONES CONTROLLERS
// =========================================================

// GET /api/admin/taxi/coverage-zones
export async function adminGetCoverageZones(req: AuthRequest, res: Response) {
  try {
    const zones = await getStoredCoverageZones();
    const activeCount = zones.filter(z => z.isCovered).length;
    return res.json({
      success: true,
      count: zones.length,
      activeCoveredCount: activeCount,
      data: zones
    });
  } catch (err: any) {
    console.error("❌ Admin Get Coverage Zones Error:", err);
    return res.status(500).json({ success: false, message: "Server error retrieving coverage zones", error: err?.message });
  }
}

// PUT /api/admin/taxi/coverage-zones
export async function adminUpdateCoverageZones(req: AuthRequest, res: Response) {
  try {
    const { zones } = req.body;
    if (!zones || !Array.isArray(zones)) {
      return res.status(400).json({ success: false, message: "Array of zones required" });
    }
    const saved = await saveStoredCoverageZones(zones);
    await logAdminActivity(req, "UPDATE_COVERAGE_ZONES", "CoverageZone", "GLOBAL", { 
      count: saved.length, 
      active: saved.filter(z => z.isCovered).length 
    });
    return res.json({
      success: true,
      message: "Service coverage zones updated successfully",
      data: saved
    });
  } catch (err: any) {
    console.error("❌ Admin Update Coverage Zones Error:", err);
    return res.status(500).json({ success: false, message: "Server error saving coverage zones", error: err?.message });
  }
}

// POST /api/admin/taxi/coverage-zones/toggle
export async function adminToggleCoverageZone(req: AuthRequest, res: Response) {
  try {
    const { zoneId, isCovered } = req.body;
    if (!zoneId) {
      return res.status(400).json({ success: false, message: "zoneId required" });
    }
    const zones = await getStoredCoverageZones();
    const zone = zones.find(z => z.id === zoneId);
    if (!zone) {
      return res.status(404).json({ success: false, message: "Zone not found" });
    }
    zone.isCovered = isCovered !== undefined ? Boolean(isCovered) : !zone.isCovered;
    zone.updatedAt = new Date().toISOString();
    await saveStoredCoverageZones(zones);
    return res.json({
      success: true,
      message: `Zone '${zone.name}' updated to ${zone.isCovered ? 'covered' : 'notcovered'}`,
      data: zone
    });
  } catch (err: any) {
    console.error("❌ Admin Toggle Coverage Zone Error:", err);
    return res.status(500).json({ success: false, message: "Server error toggling coverage zone", error: err?.message });
  }
}

// PATCH & POST /api/admin/taxi/vehicles/:id/status or /toggle-status or /toggle-online
export async function adminToggleVehicleStatus(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const vehicle = await db.Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    const { isActive, isOnline, status, online, active } = req.body || {};
    const rawVal = status ?? isOnline ?? isActive ?? online ?? active ?? req.query.status ?? req.query.isOnline;

    let targetOnline: boolean;
    if (rawVal !== undefined && rawVal !== null) {
      if (typeof rawVal === "string") {
        const lower = rawVal.toLowerCase().trim();
        targetOnline = lower === "online" || lower === "true" || lower === "1" || lower === "active";
      } else {
        targetOnline = Boolean(rawVal);
      }
    } else {
      targetOnline = !vehicle.isActive;
    }

    await vehicle.update({
      isActive: targetOnline,
      updatedAt: new Date()
    });

    try {
      const io = getIO();
      const payload = {
        vehicleId: vehicle.id,
        driverUserId: vehicle.userId,
        vehicleRegNum: vehicle.vehicleRegNum,
        isActive: targetOnline,
        isOnline: targetOnline,
        status: targetOnline ? "online" : "offline",
        latitude: vehicle.latitude,
        longitude: vehicle.longitude,
        updatedAt: vehicle.updatedAt
      };
      io?.to("admin_room").emit("driver_status_changed", payload);
      io?.to("admin_room").emit("drivers_status_updated", payload);
      io?.to("nearby_drivers").emit("driver_status_changed", payload);
    } catch (_) {}

    return res.json({
      success: true,
      message: `Vehicle ${vehicle.vehicleRegNum} status set to ${targetOnline ? 'ONLINE' : 'OFFLINE'}`,
      data: {
        id: vehicle.id,
        vehicleRegNum: vehicle.vehicleRegNum,
        isActive: vehicle.isActive,
        isOnline: vehicle.isActive,
        status: vehicle.isActive ? "online" : "offline",
        updatedAt: vehicle.updatedAt
      }
    });
  } catch (err: any) {
    console.error("ADMIN TOGGLE VEHICLE STATUS ERROR:", err);
    return res.status(500).json({ success: false, message: err?.message || "Server error" });
  }
}

// POST /api/admin/taxi/bookings/:id/send-receipt & /email-receipt
export async function adminSendBookingReceiptEmail(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const targetEmail = req.body?.email || req.query?.email;

    const booking = await db.VehicleBooking.findByPk(id, {
      include: [
        {
          model: db.Vehicle,
          as: "vehicle",
          include: [
            { model: db.VehicleType, as: "vehicleType" },
            { model: db.User, as: "driver", attributes: ["id", "name", "email", "phoneNumber", "avatar"] }
          ]
        },
        {
          model: db.User,
          as: "passenger",
          attributes: ["id", "name", "email", "phoneNumber", "avatar"]
        }
      ]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const receipt = buildBookingReceipt(booking);
    const toEmail = (targetEmail as string) || (booking as any).passenger?.email;

    if (!toEmail) {
      return res.status(400).json({ success: false, message: "No passenger email address found. Provide an email in request body." });
    }

    const { sendRideReceiptEmail } = await import("../../../services/emailService");
    const sent = await sendRideReceiptEmail({
      toEmail,
      passengerName: receipt.passenger?.name || "Valued Rider",
      invoiceNo: receipt.invoiceNo,
      bookingId: String(booking.id),
      date: booking.createdAt,
      completedAt: booking.updatedAt,
      pickupAddress: receipt.pickupAddress,
      dropoffAddress: receipt.dropAddress,
      distanceKm: receipt.distanceKm,
      driverName: receipt.driver?.name || "Driver",
      driverPhone: receipt.driver?.phoneNumber || "",
      vehicleRegNum: receipt.driver?.vehicleRegNum || "Vehicle",
      vehicleType: receipt.driver?.vehicleType || "Taxi",
      paymentMethod: receipt.paymentMethod,
      paymentStatus: receipt.paymentStatus,
      baseFare: receipt.baseFare,
      ratePerKm: receipt.ratePerKm,
      distanceFare: receipt.distanceFare,
      pickupFare: receipt.pickupFare,
      waitingMinutes: receipt.waitingMinutes,
      waitingFare: receipt.waitingFare,
      totalFare: receipt.totalFare,
    });

    return res.json({
      success: true,
      message: sent ? `Receipt email sent to ${toEmail}` : `Failed to send email to ${toEmail}`,
      toEmail,
      invoiceNo: receipt.invoiceNo
    });
  } catch (err: any) {
    console.error("ADMIN SEND RECEIPT EMAIL ERROR:", err);
    return res.status(500).json({ success: false, message: "Failed to send receipt email" });
  }
}



