import dotenv from "dotenv";
dotenv.config();

import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import { db, sequelize } from "./db";
import bcrypt from "bcrypt";

async function seedTaxiData() {
  try {
    console.log("🌱 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Database connected successfully!");

    // Ensure models/tables are synced
    await sequelize.sync({ alter: false });
    console.log("✅ Database synced.");

    const passwordHash = await bcrypt.hash("123456", 10);

    // ---------------------------------------------------------
    // 1. Create Vehicle Types
    // ---------------------------------------------------------
    console.log("\n🚕 1. Seeding Vehicle Types...");
    
    const vehicleTypesData = [
      // Hire (Passenger / Taxi)
      { type: "Bike", category: "hire" as const, baseFare: 80, ratePerKm: 50, seats: 1 },
      { type: "Tuk", category: "hire" as const, baseFare: 100, ratePerKm: 80, seats: 3 },
      { type: "Car", category: "hire" as const, baseFare: 200, ratePerKm: 120, seats: 4 },
      { type: "Flex", category: "hire" as const, baseFare: 250, ratePerKm: 140, seats: 4 },
      { type: "Mini Van", category: "hire" as const, baseFare: 350, ratePerKm: 170, seats: 7 },
      { type: "Van", category: "hire" as const, baseFare: 450, ratePerKm: 200, seats: 10 },

      // Transport (Goods & Heavy Transport)
      { type: "Batta", category: "transport" as const, baseFare: 400, ratePerKm: 180, seats: 2 },
      { type: "Truck", category: "transport" as const, baseFare: 800, ratePerKm: 300, seats: 2 },
      { type: "Tipper", category: "transport" as const, baseFare: 1200, ratePerKm: 400, seats: 2 },
      { type: "10 wheel Tipper", category: "transport" as const, baseFare: 2000, ratePerKm: 600, seats: 2 },
      { type: "Large Tractor", category: "transport" as const, baseFare: 1000, ratePerKm: 350, seats: 1 },
      { type: "Farm Tractor", category: "transport" as const, baseFare: 900, ratePerKm: 300, seats: 1 },
    ];

    const vehicleTypeMap: Record<string, any> = {};

    for (const item of vehicleTypesData) {
      const [vType] = await db.VehicleType.findOrCreate({
        where: { type: item.type },
        defaults: item,
      });
      vehicleTypeMap[item.type] = vType;
      console.log(`   - VehicleType: ${vType.type} (ID: ${vType.id})`);
    }

    // ---------------------------------------------------------
    // 2. Create Users (Drivers, Passengers, Admin)
    // ---------------------------------------------------------
    console.log("\n👤 2. Seeding Users...");

    const usersData = [
      { name: "Saman Kumara (Tuk Driver)", email: "driver1@test.com", phoneNumber: "0771112223" },
      { name: "Kamal Perera (Car Driver)", email: "driver2@test.com", phoneNumber: "0772223334" },
      { name: "Nimal Fernando (Van Driver)", email: "driver3@test.com", phoneNumber: "0773334445" },
      { name: "Sunil Passenger", email: "passenger1@test.com", phoneNumber: "0774445556" },
      { name: "Amara Passenger", email: "passenger2@test.com", phoneNumber: "0775556667" },
      { name: "Madhu Admin", email: "madhu@test.com", phoneNumber: "0712345678" },
      { name: "Taxi Admin", email: "admin@test.com", phoneNumber: "0770000000" },
    ];

    const userMap: Record<string, any> = {};

    for (const u of usersData) {
      const [user] = await db.User.findOrCreate({
        where: { email: u.email },
        defaults: {
          name: u.name,
          email: u.email,
          password: passwordHash,
          phoneNumber: u.phoneNumber,
          emailVerified: true,
          phoneVerified: true,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`,
        },
      });
      userMap[u.email] = user;
      console.log(`   - User: ${user.name} (${user.email})`);
    }

    // ---------------------------------------------------------
    // 3. Create Vehicles
    // ---------------------------------------------------------
    console.log("\n🚗 3. Seeding Vehicles...");

    const vehiclesData = [
      {
        driverEmail: "driver1@test.com",
        typeKey: "Tuk",
        regNum: "AB-1234",
        color: "Red",
        status: "approved",
        isActive: true,
        latitude: 6.9271,
        longitude: 79.8612,
        baseLatitude: 6.9271,
        baseLongitude: 79.8612,
        baseAddress: "Fort Railway Station, Colombo",
        ratePerKm: 80,
        baseFare: 100,
        pickupFare: 50,
        showMobileNum: true,
      },
      {
        driverEmail: "driver2@test.com",
        typeKey: "Car",
        regNum: "WP-5678",
        color: "Silver",
        status: "approved",
        isActive: true,
        latitude: 6.8649,
        longitude: 79.8997,
        baseLatitude: 6.8649,
        baseLongitude: 79.8997,
        baseAddress: "Nugegoda Supermarket, Colombo",
        ratePerKm: 120,
        baseFare: 200,
        pickupFare: 100,
        showMobileNum: true,
      },
      {
        driverEmail: "driver3@test.com",
        typeKey: "Van",
        regNum: "CP-9012",
        color: "White",
        status: "approved",
        isActive: false, // Offline - base location in Kandy
        latitude: null,
        longitude: null,
        baseLatitude: 7.2906,
        baseLongitude: 80.6337,
        baseAddress: "Clock Tower, Kandy",
        ratePerKm: 200,
        baseFare: 500,
        pickupFare: 150,
        showMobileNum: false,
      },
    ];

    const vehicleMap: Record<string, any> = {};

    for (const vData of vehiclesData) {
      const driver = userMap[vData.driverEmail];
      const vType = vehicleTypeMap[vData.typeKey];

      const [vehicle] = await db.Vehicle.findOrCreate({
        where: { vehicleRegNum: vData.regNum },
        defaults: {
          userId: driver.id,
          vehicleTypeId: vType.id,
          vehicleRegNum: vData.regNum,
          approvalStatus: vData.status,
          mobileNum: driver.phoneNumber || "0770000000",
          showMobileNum: vData.showMobileNum,
          color: vData.color,
          isActive: vData.isActive,
          ratePerKm: vData.ratePerKm,
          baseFare: vData.baseFare,
          pickupFare: vData.pickupFare,
          latitude: vData.latitude,
          longitude: vData.longitude,
          baseLatitude: vData.baseLatitude,
          baseLongitude: vData.baseLongitude,
          baseAddress: vData.baseAddress,
        },
      });
      vehicleMap[vData.regNum] = vehicle;
      console.log(`   - Vehicle: ${vehicle.vehicleRegNum} (${vData.typeKey}) -> Driver: ${driver.name}`);

      // Seed Vehicle Images
      await db.VehicleImage.findOrCreate({
        where: { vehicleId: vehicle.id },
        defaults: {
          vehicleId: vehicle.id,
          imageFrontUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341",
          imageBackUrl: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d",
          imageInUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70",
        },
      });

      // Seed Driver Document
      await db.DriverDocument.findOrCreate({
        where: { userId: driver.id },
        defaults: {
          userId: driver.id,
          documentType: "NIC",
          frontUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
          backUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe",
        },
      });
    }

    // ---------------------------------------------------------
    // 4. Create Sample Vehicle Bookings
    // ---------------------------------------------------------
    console.log("\n📑 4. Seeding Sample Bookings...");

    const passenger1 = userMap["passenger1@test.com"];
    const passenger2 = userMap["passenger2@test.com"];
    const tukVehicle = vehicleMap["AB-1234"];
    const carVehicle = vehicleMap["WP-5678"];

    const bookingsData = [
      {
        userId: passenger1.id,
        vehicleId: tukVehicle.id,
        pickupLat: 6.9271,
        pickupLng: 79.8612,
        dropLat: 6.8649,
        dropLng: 79.8997,
        pickupAddress: "Fort, Colombo",
        dropAddress: "Nugegoda, Colombo",
        distance: 8.5,
        fare: 730,
        status: "pending",
      },
      {
        userId: passenger2.id,
        vehicleId: carVehicle.id,
        pickupLat: 6.8649,
        pickupLng: 79.8997,
        dropLat: 6.9271,
        dropLng: 79.8612,
        pickupAddress: "Nugegoda Junction",
        dropAddress: "Colombo Pettah",
        distance: 9.0,
        fare: 1280,
        status: "accepted",
      },
    ];

    for (const b of bookingsData) {
      const existing = await db.VehicleBooking.findOne({
        where: { userId: b.userId, vehicleId: b.vehicleId, status: b.status },
      });
      if (!existing) {
        const newBooking = await db.VehicleBooking.create(b as any);
        console.log(`   - Booking Created: ID ${newBooking.id} (${b.status})`);
      }
    }

    console.log("\n==================================================");
    console.log("🎉 SEEDING COMPLETED SUCCESSFULLY TO NEON DB!");
    console.log("==================================================");
    console.log("Test Login Credentials (Password for all: 123456):");
    console.log(" - Driver 1 (Tuk):       driver1@test.com");
    console.log(" - Driver 2 (Car):       driver2@test.com");
    console.log(" - Driver 3 (Van):       driver3@test.com");
    console.log(" - Passenger 1:          passenger1@test.com");
    console.log(" - Passenger 2:          passenger2@test.com");
    console.log(" - Taxi Admin:           admin@test.com");
    console.log("==================================================\n");

  } catch (err) {
    console.error("❌ Seed Taxi Data Error:", err);
  } finally {
    process.exit(0);
  }
}

seedTaxiData();
