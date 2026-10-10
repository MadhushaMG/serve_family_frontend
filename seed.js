"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const db_1 = require("./src/db");
const bcrypt_1 = __importDefault(require("bcrypt"));
function seed() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("🌱 Seeding started...");
            yield db_1.db.sequelize.authenticate();
            console.log("✅ Database connected.");
            const passwordHash = yield bcrypt_1.default.hash("123456", 12);
            console.log("👤 Creating Users...");
            const [creator] = yield db_1.db.User.findOrCreate({
                where: { email: "madhu@test.com" },
                defaults: {
                    name: "Madhu Creator",
                    email: "madhu@test.com",
                    password: passwordHash,
                    emailVerified: true,
                    phoneNumber: "0712345678",
                    phoneVerified: true,
                    avatar: "https://i.pravatar.cc/150?u=madhu"
                }
            });
            const [member] = yield db_1.db.User.findOrCreate({
                where: { email: "kasun@test.com" },
                defaults: {
                    name: "Kasun Member",
                    email: "kasun@test.com",
                    password: passwordHash,
                    emailVerified: true,
                    phoneNumber: "0771234567",
                    phoneVerified: true,
                    avatar: "https://i.pravatar.cc/150?u=kasun"
                }
            });
            console.log(`✅ Users Ready: ${creator.name}, ${member.name}`);
            console.log("⭕ Creating Circle...");
            const [circle] = yield db_1.db.Circle.findOrCreate({
                where: { invitationCode: "TEST01" },
                defaults: {
                    name: "Test Family Circle",
                    creatorId: creator.id,
                    invitationCode: "TEST01",
                    invitationCodeExpiresAt: new Date(Date.now() + 86400000)
                }
            });
            console.log("🤝 Adding Memberships...");
            const creatorMem = yield db_1.db.Membership.findOne({ where: { userId: creator.id, circleId: circle.id } });
            if (!creatorMem) {
                yield db_1.db.Membership.create({
                    userId: creator.id,
                    circleId: circle.id,
                    role: "admin",
                    status: "accepted"
                });
            }
            const memberMem = yield db_1.db.Membership.findOne({ where: { userId: member.id, circleId: circle.id } });
            if (!memberMem) {
                yield db_1.db.Membership.create({
                    userId: member.id,
                    circleId: circle.id,
                    role: "member",
                    status: "accepted"
                });
            }
            console.log("📍 Adding Locations...");
            const [homeLoc] = yield db_1.db.Location.findOrCreate({
                where: { circleId: circle.id, name: "Home" },
                defaults: {
                    circleId: circle.id,
                    name: "Home",
                    latitude: 6.9271,
                    longitude: 79.8612,
                    metadata: { isCommonLocation: true }
                }
            });
            console.log("⏳ Adding Location History...");
            yield db_1.db.LocationHistory.create({
                userId: creator.id,
                circleId: circle.id,
                latitude: 6.9271,
                longitude: 79.8612,
                createdAt: new Date()
            });
            yield db_1.db.LocationHistory.create({
                userId: creator.id,
                circleId: circle.id,
                latitude: 6.9300,
                longitude: 79.8650,
                createdAt: new Date(Date.now() - 1000 * 60 * 30)
            });
            yield db_1.db.LocationHistory.create({
                userId: member.id,
                circleId: circle.id,
                latitude: 7.2906,
                longitude: 80.6337,
                createdAt: new Date()
            });
            yield db_1.db.LocationHistory.create({
                userId: member.id,
                circleId: circle.id,
                latitude: 7.2950,
                longitude: 80.6350,
                createdAt: new Date(Date.now() - 1000 * 60 * 30)
            });
            console.log("✅ Seeding completed successfully! 🎉");
        }
        catch (error) {
            console.error("❌ Seeding failed:", error);
        }
        finally {
            process.exit();
        }
    });
}
seed();
