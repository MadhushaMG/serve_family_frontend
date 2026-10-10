import net from "net";
import { env } from "../config/env";
import { TrackerData } from "../db/models/TrackerData";
import { UserDevice } from "../db/models/UserDevice";
import { UserLocation } from "../db/models/UserLocation";
import { checkGeofenceTriggers } from "./geofenceLogic";
import { getMessaging } from "firebase-admin/messaging";

function getLogTime(): string {
  return new Date().toLocaleString("en-US", {
    timeZone: "Asia/Colombo",
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

function log(message: string) {
  console.log(`[${getLogTime()}] ${message}`);
}

async function triggerNotification(userId: string, deviceId: string, title: string, body: string) {
    try {
        await UserDevice.update({ notificationStatus: 'unread' }, { where: { deviceId } });
        log(`🔔 Notification Saved & Sent: ${title}`);
    } catch (err) {
        log(`❌ Notification Error: ${err}`);
    }
}



const CRC_TABLE = [
  0x0000, 0x1189, 0x2312, 0x329b, 0x4624, 0x57ad, 0x6536, 0x74bf, 0x8c48, 0x9dc1, 0xaf5a, 0xbed3, 0xca6c, 0xdbe5, 0xe97e, 0xf8f7,
  0x1081, 0x0108, 0x3393, 0x221a, 0x56a5, 0x472c, 0x75b7, 0x643e, 0x9cc9, 0x8d40, 0xbfdb, 0xae52, 0xdaed, 0xcb64, 0xf9ff, 0xe876,
  0x2102, 0x308b, 0x0210, 0x1399, 0x6726, 0x76af, 0x4434, 0x55bd, 0xad4a, 0xbcc3, 0x8e58, 0x9fd1, 0xeb6e, 0xfae7, 0xc87c, 0xd9f5,
  0x3183, 0x200a, 0x1291, 0x0318, 0x77a7, 0x662e, 0x54b5, 0x453c, 0xbdcb, 0xac42, 0x9ed9, 0x8f50, 0xfbef, 0xea66, 0xd8fd, 0xc974,
  0x4204, 0x538d, 0x6116, 0x709f, 0x0420, 0x15a9, 0x2732, 0x36bb, 0xce4c, 0xdfc5, 0xed5e, 0xfcd7, 0x8868, 0x99e1, 0xab7a, 0xbaf3,
  0x5285, 0x430c, 0x7197, 0x601e, 0x14a1, 0x0528, 0x37b3, 0x263a, 0xdecd, 0xcf44, 0xfddf, 0xec56, 0x98e9, 0x8960, 0xbbfb, 0xaa72,
  0x6306, 0x728f, 0x4014, 0x519d, 0x2522, 0x34ab, 0x0630, 0x17b9, 0xef4e, 0xfec7, 0xcc5c, 0xddd5, 0xa96a, 0xb8e3, 0x8a78, 0x9bf1,
  0x7387, 0x620e, 0x5095, 0x411c, 0x35a3, 0x242a, 0x16b1, 0x0738, 0xffcf, 0xee46, 0xdcdd, 0xcd54, 0xb9eb, 0xa862, 0x9af9, 0x8b70,
  0x8408, 0x9581, 0xa71a, 0xb693, 0xc22c, 0xd3a5, 0xe13e, 0xf0b7, 0x0840, 0x19c9, 0x2b52, 0x3adb, 0x4e64, 0x5fed, 0x6d76, 0x7cff,
  0x9489, 0x8500, 0xb79b, 0xa612, 0xd2ad, 0xc324, 0xf1bf, 0xe036, 0x18c1, 0x0948, 0x3bd3, 0x2a5a, 0x5ee5, 0x4f6c, 0x7df7, 0x6c7e,
  0xa50a, 0xb483, 0x8618, 0x9791, 0xe32e, 0xf2a7, 0xc03c, 0xd1b5, 0x2942, 0x38cb, 0x0a50, 0x1bd9, 0x6f66, 0x7eef, 0x4c74, 0x5dfd,
  0xb58b, 0xa402, 0x9699, 0x8710, 0xf3af, 0xe226, 0xd0bd, 0xc134, 0x39c3, 0x284a, 0x1ad1, 0x0b58, 0x7fe7, 0x6e6e, 0x5cf5, 0x4d7c,
  0xc60c, 0xd785, 0xe51e, 0xf497, 0x8028, 0x91a1, 0xa33a, 0xb2b3, 0x4a44, 0x5bcd, 0x6956, 0x78df, 0x0c60, 0x1de9, 0x2f72, 0x3efb,
  0xd68d, 0xc704, 0xf59f, 0xe416, 0x90a9, 0x8120, 0xb3bb, 0xa232, 0x5ac5, 0x4b4c, 0x79d7, 0x685e, 0x1ce1, 0x0d68, 0x3ff3, 0x2e7a,
  0xe70e, 0xf687, 0xc41c, 0xd595, 0xa12a, 0xb0a3, 0x8238, 0x93b1, 0x6b46, 0x7acf, 0x4854, 0x59dd, 0x2d62, 0x3ceb, 0x0e70, 0x1ff9,
  0xf78f, 0xe606, 0xd49d, 0xc514, 0xb1ab, 0xa022, 0x92b9, 0x8330, 0x7bc7, 0x6a4e, 0x58d5, 0x495c, 0x3de3, 0x2c6a, 0x1ef1, 0x0f78
];

function getCRC16(buffer: Buffer): number {
  let crc = 0xffff;
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return ~crc & 0xffff;
}

function createResponsePacket(protocol: number, serial: Buffer): Buffer {
  const length = 0x05;
  const dataForCrc = Buffer.alloc(4);
  dataForCrc.writeUInt8(length, 0);
  dataForCrc.writeUInt8(protocol, 1);
  dataForCrc.set(serial, 2);
  const crc = getCRC16(dataForCrc);
  const packet = Buffer.alloc(10);
  packet.writeUInt16BE(0x7878, 0);
  packet.writeUInt8(length, 2);
  packet.writeUInt8(protocol, 3);
  packet.set(serial, 4);
  packet.writeUInt16BE(crc, 6);
  packet.writeUInt16BE(0x0d0a, 8);
  return packet;
}

interface ParsedHQPacket {
  header: string; deviceId: string; msgType: string; time: string | null; gpsStatus: string;
  latitude: number | null; longitude: number | null; speed: number; course: number;
  date: string | null; statusHex: string; extra: string[]; gsmSignal?: number;
  powerStatus?: string; accStatus?: string; batteryVoltage?: string; satellites?: number;
}

interface TrackerSocket extends net.Socket { deviceId?: string; lastStatus?: any; }

let trackerServer: net.Server | null = null;

function parseHQ(line: string): ParsedHQPacket {
  const sections = line.split("*");
  const mainParts = sections[0].split(",");
  let gsmSignal = 0, powerStatus = "0", accStatus = "OFF", batteryVoltage = "0V", satellites = 0;
  sections.forEach(field => {
    if (field.startsWith("GSM:")) gsmSignal = parseInt(field.split(":")[1]);
    if (field.startsWith("POW:")) powerStatus = field.split(":")[1];
    if (field.startsWith("ACC:")) accStatus = field.split(":")[1] === "1" ? "ON" : "OFF";
    if (field.startsWith("BAT:")) batteryVoltage = field.split(":")[1];
    if (field.startsWith("S:")) satellites = parseInt(field.split(":")[1].split("/")[0]);
  });
  return {
    header: mainParts[0] || "", deviceId: mainParts[1]?.replace("ID:", "") || "",
    msgType: mainParts[2] || "HQ", time: parseTime(mainParts[3]), gpsStatus: mainParts[4] || "",
    latitude: fixLat(mainParts[5], mainParts[6]), longitude: fixLon(mainParts[7], mainParts[8]),
    speed: Number(mainParts[9]) || 0, course: Number(mainParts[10]) || 0, date: parseDate(mainParts[11]),
    statusHex: mainParts[12] || "", extra: sections, gsmSignal, powerStatus, accStatus, batteryVoltage, satellites
  };
}

function parseTKStatus(line: string): ParsedHQPacket | null {
  const sections = line.split("*");
  let deviceId = "", batteryVoltage = "0V", gsmSignal = 0, accStatus = "OFF", powerStatus = "0", satellites = 0;
  sections.forEach(field => {
    if (field.startsWith("ID:")) deviceId = field.split(":")[1];
    if (field.startsWith("BAT:")) batteryVoltage = field.split(":")[1];
    if (field.startsWith("GSM:")) gsmSignal = parseInt(field.split(":")[1]) || 0;
    if (field.startsWith("ACC:")) accStatus = field.split(":")[1] === "1" ? "ON" : "OFF";
    if (field.startsWith("POW:")) powerStatus = field.split(":")[1];
    if (field.startsWith("S:")) satellites = parseInt(field.split(":")[1].split("/")[0]) || 0;
  });
  if (!deviceId) return null;
  return {
    header: sections[0], deviceId, msgType: "HEARTBEAT", time: null, gpsStatus: "V",
    latitude: null, longitude: null, speed: 0, course: 0, date: null, statusHex: "",
    extra: sections, gsmSignal, powerStatus, accStatus, batteryVoltage, satellites
  };
}

function fixLat(str: string | undefined, ns: string | undefined): number | null {
  const dd = ddmmToDec(str); return dd == null ? null : ns === "S" ? -dd : dd;
}
function fixLon(str: string | undefined, ew: string | undefined): number | null {
  const dd = ddmmToDec(str); return dd == null ? null : ew === "W" ? -dd : dd;
}
function ddmmToDec(v: string | undefined): number | null {
  if (!v) return null;
  const n = parseFloat(v);
  if (Number.isNaN(n)) return null;
  const deg = Math.floor(n / 100);
  const min = n - deg * 100;
  return deg + min / 60;
}
function parseTime(t: string | undefined): string | null {
  if (!t || t.length !== 6) return null;
  return `${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}`;
}
function parseDate(d: string | undefined): string | null {
  if (!d || d.length !== 6) return null;
  return `20${d.slice(4, 6)}-${d.slice(2, 4)}-${d.slice(0, 2)}`;
}

function parseGT06Status(content: Buffer) {
  const termInfo = content[0];
  const acc = (termInfo & 0x02) ? "ON" : "OFF";
  const power = (termInfo & 0x01) ? "ON" : "OFF";
  const gpsTracking = (termInfo & 0x40) ? "ON" : "OFF";
  const voltage = content[1];
  const gsmSignal = content[2];
  return { acc, power, voltage, gsmSignal, gpsTracking };
}



async function checkDeviceNotifications(device: any, packet: any) {
  if (packet.powerStatus === 'ON') {
      await UserDevice.update({ notificationStatus: 'unread' }, { where: { deviceId: device.deviceId } } as any);
  }
}


async function saveTrackerData(packet: any, rawData: string): Promise<void> {
  try {
    const batteryVal = packet.batteryVoltage || (packet.status ? `${packet.status.voltage}/6` : null);
    await TrackerData.create({
      deviceId: packet.deviceId, msgType: packet.msgType || "GT06",
      gpsStatus: packet.gpsStatus || "V", latitude: packet.latitude || null,
      longitude: packet.longitude || null, speed: packet.speed || null,
      course: packet.course || null, accStatus: packet.accStatus || (packet.status ? packet.status.acc : null),
      powerStatus: packet.powerStatus || (packet.status ? packet.status.power : null),
      gsmSignal: packet.gsmSignal || (packet.status ? packet.status.gsmSignal : null),
      batteryVoltage: batteryVal, satellites: packet.satellites || 0,
      statusHex: packet.statusHex || null, rawData: rawData,
      metadata: { time: packet.time, date: packet.date, header: packet.header, extra: packet.extra, deviceStatus: packet.status },
    });
    log(`✅ Data Saved for: ${packet.deviceId} (Bat: ${batteryVal || 'N/A'})`);
    const userDevice = await UserDevice.findOne({ where: { deviceId: packet.deviceId } });
    if (userDevice) {
      await checkDeviceNotifications(userDevice, packet);
      const existingLocation = await UserLocation.findOne({ where: { userId: userDevice.userId, circleId: null, locationId: null } });
      const meta = { ...(existingLocation?.metadata || {}), batteryLevel: batteryVal || existingLocation?.metadata?.batteryLevel, accStatus: packet.accStatus || (packet.status ? packet.status.acc : existingLocation?.metadata?.accStatus), gsmSignal: packet.gsmSignal || (packet.status ? packet.status.gsmSignal : existingLocation?.metadata?.gsmSignal), lastSeen: new Date() };
      if (existingLocation) {
        const updateData: any = { metadata: meta };
        if (packet.latitude && packet.longitude) { updateData.latitude = packet.latitude; updateData.longitude = packet.longitude; }
        await existingLocation.update(updateData);
      } else if (packet.latitude && packet.longitude) {
        await UserLocation.create({ userId: userDevice.userId, latitude: packet.latitude, longitude: packet.longitude, circleId: null, locationId: null, metadata: meta } as any);

try {
            const { db } = require("../db"); // උඩ import කරලා නැත්නම් මේක සේෆ්
            await db.Vehicle.update(
                { latitude: packet.latitude, longitude: packet.longitude },
                { 
                    where: { 
                        userId: userDevice.userId, 
                        isActive: true 
                    } 
                }
            );
        } catch (vehErr) {
            console.error("Vehicle location sync error:", vehErr);
        }      
}
      if (packet.latitude && packet.longitude) {
        checkGeofenceTriggers(userDevice.userId, packet.latitude, packet.longitude, undefined, true, packet.deviceId).catch(err => console.error("❌ Geofence Check Error:", err));
      }
    }
  } catch (error) { console.error(`❌ Error saving data:`, error); }
}

export function startTrackerServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      trackerServer = net.createServer((socket: TrackerSocket) => {
        log(`Device connected: ${socket.remoteAddress}`);
        let gt06Buffer = Buffer.alloc(0);
        let buffer = "";
        socket.on("data", (data) => {
          gt06Buffer = Buffer.concat([gt06Buffer, data]);
          while (gt06Buffer.length > 0) {
            if (gt06Buffer.length >= 2 && gt06Buffer[0] === 0x78 && gt06Buffer[1] === 0x78) {
              if (gt06Buffer.length < 5) break;
              const packetLen = gt06Buffer[2];
              const totalPacketLen = 5 + packetLen;
              if (gt06Buffer.length < totalPacketLen) break;
              const packet = gt06Buffer.subarray(0, totalPacketLen);
              gt06Buffer = gt06Buffer.subarray(totalPacketLen);
              const protocol = packet[3];
              const serial = packet.subarray(packet.length - 4, packet.length - 2);
              if (protocol === 0x01) {
                const terminalId = packet.subarray(4, 12).toString("hex");
                socket.deviceId = terminalId;
                log(`>> GT06 Login: ${terminalId}`);
                socket.write(createResponsePacket(0x01, serial));
              } else if (protocol === 0x13) {
                const status = parseGT06Status(packet.subarray(4, 9));
                socket.lastStatus = status;
                log(`[${socket.deviceId}] Heartbeat (Bat: ${status.voltage}/6)`);
                socket.write(createResponsePacket(0x13, serial));
              } else if (protocol === 0x12) {
                const info = packet.subarray(4, packet.length - 4);
                let lat = (info.readUInt32BE(7) / 30000) / 60;
                let lon = (info.readUInt32BE(11) / 30000) / 60;
                
                if (info.length >= 18) {
                  const courseStatus = info.readUInt16BE(16);
                  const isWest = (courseStatus & 0x0800) !== 0;
                  const isSouth = (courseStatus & 0x0400) === 0;
                  if (isSouth) lat = -lat;
                  if (isWest) lon = -lon;
                }
                
                saveTrackerData({ deviceId: socket.deviceId, latitude: lat, longitude: lon, speed: info[15], status: socket.lastStatus, msgType: "GT06_LOC" }, packet.toString('hex'));
              }
              continue;
            }
            if (gt06Buffer.length > 0 && gt06Buffer[0] !== 0x78) { buffer += gt06Buffer.subarray(0, 1).toString('ascii'); gt06Buffer = gt06Buffer.subarray(1); } else break;
          }
          if (buffer.includes("\n")) {
             const lines = buffer.split(/[\r\n]+/);
             buffer = lines.pop() || "";
             for (const line of lines) {
                if (line.startsWith("*HQ")) saveTrackerData(parseHQ(line), line);
                else if (line.startsWith("TK")) { const p = parseTKStatus(line); if(p) saveTrackerData(p, line); }
             }
          }
        });
        socket.on("error", (err) => console.error(`Socket error: ${err.message}`));
      });
      trackerServer.listen(env.TRACKER_PORT, "0.0.0.0", () => {
        log(`📡 Tracker server listening on port ${env.TRACKER_PORT}...`);
        resolve();
      });
      trackerServer.on("error", reject);
    } catch (error) { reject(error); }
  });
}

export function stopTrackerServer(): Promise<void> {
  return new Promise((resolve) => {
    if (trackerServer) trackerServer.close(() => resolve());
    else resolve();
  });
}
