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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const taxiController_1 = require("../src/modules/taxi/controllers/taxiController");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const req = {
            query: { pickupLat: '7.2906', pickupLng: '80.6337', radiusKm: '20' },
            user: { userId: 'd83edcfd-6ba2-43f6-86ff-081341ebb3fd' }
        };
        const res = {
            status(code) {
                console.log('HTTP Status:', code);
                return this;
            },
            json(data) {
                var _a;
                console.log('HTTP JSON Success:', data.success);
                if (data.data) {
                    console.log('Items returned:', data.data.length);
                    for (const item of data.data) {
                        console.log(`- ${item.vehicleRegNum} (${(_a = item.vehicleType) === null || _a === void 0 ? void 0 : _a.type}): distance=${item.distance}km, fare=Rs.${item.estimatedFare}`);
                    }
                }
                else {
                    console.log('Data payload:', data);
                }
                return this;
            }
        };
        try {
            yield (0, taxiController_1.getAvailableRides)(req, res);
        }
        catch (err) {
            console.error('CRASH in getAvailableRides:', err);
        }
        process.exit(0);
    });
}
main();
