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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// prisma/seed-with-reminders.ts
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var tuteur, patientsData, patients, _i, patientsData_1, patientData, patient, doctorsData, doctors, _a, doctorsData_1, doctorData, doctor, patientRelationships, _b, patients_1, patient, relationship, doctorRelationships, _c, doctors_1, doctor, relationship, medicationsData, medications, _d, medicationsData_1, medicationData, medication, prescriptionsData, prescriptions, _e, prescriptionsData_1, prescriptionData, prescription, now, patient1ReminderTimes, patient2ReminderTimes, patient3ReminderTimes, i, reminder, i, reminder, i, reminder;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    console.log("🌱 Starting seed process with medication reminders...");
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                id: "af567578-3317-4d16-9264-46e4f677a274",
                                email: "debug@test.com",
                                passwordHash: "$2b$10$example_hash_for_debug", // bcrypt hash placeholder
                                firstName: "Debug",
                                lastName: "Tuteur",
                                phoneNumber: "+21612345678",
                                userType: client_1.UserType.tuteur,
                            },
                        })];
                case 1:
                    tuteur = _f.sent();
                    console.log("✅ Tuteur created:", tuteur.email);
                    patientsData = [
                        {
                            email: "patient1@example.com",
                            passwordHash: "$2b$10$example_hash_for_patient1",
                            firstName: "Sophie",
                            lastName: "Lefevre",
                            phoneNumber: "+21611111111",
                            userType: client_1.UserType.patient,
                        },
                        {
                            email: "patient2@example.com",
                            passwordHash: "$2b$10$example_hash_for_patient2",
                            firstName: "Marie",
                            lastName: "Dubois",
                            phoneNumber: "+21622222222",
                            userType: client_1.UserType.patient,
                        },
                        {
                            email: "patient3@example.com",
                            passwordHash: "$2b$10$example_hash_for_patient3",
                            firstName: "Claire",
                            lastName: "Moreau",
                            phoneNumber: "+21633333333",
                            userType: client_1.UserType.patient,
                        },
                    ];
                    patients = [];
                    _i = 0, patientsData_1 = patientsData;
                    _f.label = 2;
                case 2:
                    if (!(_i < patientsData_1.length)) return [3 /*break*/, 5];
                    patientData = patientsData_1[_i];
                    return [4 /*yield*/, prisma.user.create({
                            data: patientData,
                        })];
                case 3:
                    patient = _f.sent();
                    patients.push(patient);
                    console.log("✅ Patient created:", patient.email);
                    _f.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    doctorsData = [
                        {
                            email: "dr.martin@example.com",
                            passwordHash: "$2b$10$example_hash_for_doctor1",
                            firstName: "Dr. Martin",
                            lastName: "Leroy",
                            phoneNumber: "+21644444444",
                            userType: client_1.UserType.medecin,
                        },
                        {
                            email: "dr.dupont@example.com",
                            passwordHash: "$2b$10$example_hash_for_doctor2",
                            firstName: "Dr. Dupont",
                            lastName: "Bernard",
                            phoneNumber: "+21655555555",
                            userType: client_1.UserType.medecin,
                        },
                        {
                            email: "dr.petit@example.com",
                            passwordHash: "$2b$10$example_hash_for_doctor3",
                            firstName: "Dr. Petit",
                            lastName: "Laurent",
                            phoneNumber: "+21666666666",
                            userType: client_1.UserType.medecin,
                        },
                    ];
                    doctors = [];
                    _a = 0, doctorsData_1 = doctorsData;
                    _f.label = 6;
                case 6:
                    if (!(_a < doctorsData_1.length)) return [3 /*break*/, 9];
                    doctorData = doctorsData_1[_a];
                    return [4 /*yield*/, prisma.user.create({
                            data: doctorData,
                        })];
                case 7:
                    doctor = _f.sent();
                    doctors.push(doctor);
                    console.log("✅ Doctor created:", doctor.email);
                    _f.label = 8;
                case 8:
                    _a++;
                    return [3 /*break*/, 6];
                case 9:
                    patientRelationships = [];
                    _b = 0, patients_1 = patients;
                    _f.label = 10;
                case 10:
                    if (!(_b < patients_1.length)) return [3 /*break*/, 13];
                    patient = patients_1[_b];
                    return [4 /*yield*/, prisma.userRelationship.create({
                            data: {
                                caregiverId: tuteur.id,
                                patientId: patient.id,
                                relationshipType: client_1.RelationshipType.tuteur,
                            },
                        })];
                case 11:
                    relationship = _f.sent();
                    patientRelationships.push(relationship);
                    _f.label = 12;
                case 12:
                    _b++;
                    return [3 /*break*/, 10];
                case 13:
                    console.log("✅ Created relationships between tuteur and patients");
                    doctorRelationships = [];
                    _c = 0, doctors_1 = doctors;
                    _f.label = 14;
                case 14:
                    if (!(_c < doctors_1.length)) return [3 /*break*/, 17];
                    doctor = doctors_1[_c];
                    return [4 /*yield*/, prisma.userRelationship.create({
                            data: {
                                caregiverId: tuteur.id,
                                patientId: doctor.id,
                                relationshipType: client_1.RelationshipType.medecin,
                            },
                        })];
                case 15:
                    relationship = _f.sent();
                    doctorRelationships.push(relationship);
                    _f.label = 16;
                case 16:
                    _c++;
                    return [3 /*break*/, 14];
                case 17:
                    console.log("✅ Created relationships between tuteur and doctors");
                    medicationsData = [
                        {
                            name: "Paracétamol",
                            genericName: "Acétaminophène",
                            dosage: "500mg",
                            form: "Comprimé",
                            description: "Analgésique et antipyrétique",
                        },
                        {
                            name: "Ibuprofène",
                            genericName: "Ibuprofène",
                            dosage: "200mg",
                            form: "Comprimé",
                            description: "Anti-inflammatoire non stéroïdien",
                        },
                        {
                            name: "Amoxicilline",
                            genericName: "Amoxicilline",
                            dosage: "500mg",
                            form: "Gélule",
                            description: "Antibiotique de la famille des bêta-lactamines",
                        },
                    ];
                    medications = [];
                    _d = 0, medicationsData_1 = medicationsData;
                    _f.label = 18;
                case 18:
                    if (!(_d < medicationsData_1.length)) return [3 /*break*/, 21];
                    medicationData = medicationsData_1[_d];
                    return [4 /*yield*/, prisma.medication.create({
                            data: medicationData,
                        })];
                case 19:
                    medication = _f.sent();
                    medications.push(medication);
                    console.log("✅ Medication created:", medication.name);
                    _f.label = 20;
                case 20:
                    _d++;
                    return [3 /*break*/, 18];
                case 21:
                    prescriptionsData = [
                        {
                            patientId: patients[0].id,
                            medicationId: medications[0].id,
                            prescribedBy: doctors[0].id,
                            customDosage: "1 comprimé 3 fois par jour",
                            instructions: "Prendre avec de l'eau après les repas",
                            startDate: new Date(),
                            endDate: new Date(new Date().setDate(new Date().getDate() + 7)),
                        },
                        {
                            patientId: patients[1].id,
                            medicationId: medications[1].id,
                            prescribedBy: doctors[1].id,
                            customDosage: "1 comprimé 2 fois par jour",
                            instructions: "Prendre avec de l'eau 1 heure avant les repas",
                            startDate: new Date(),
                            endDate: new Date(new Date().setDate(new Date().getDate() + 14)),
                        },
                        {
                            patientId: patients[2].id,
                            medicationId: medications[2].id,
                            prescribedBy: doctors[2].id,
                            customDosage: "1 gélule 2 fois par jour",
                            instructions: "Prendre avec de l'eau pendant les repas",
                            startDate: new Date(),
                            endDate: new Date(new Date().setDate(new Date().getDate() + 10)),
                        },
                    ];
                    prescriptions = [];
                    _e = 0, prescriptionsData_1 = prescriptionsData;
                    _f.label = 22;
                case 22:
                    if (!(_e < prescriptionsData_1.length)) return [3 /*break*/, 25];
                    prescriptionData = prescriptionsData_1[_e];
                    return [4 /*yield*/, prisma.prescription.create({
                            data: prescriptionData,
                        })];
                case 23:
                    prescription = _f.sent();
                    prescriptions.push(prescription);
                    console.log("✅ Prescription created for patient:", prescription.patientId);
                    _f.label = 24;
                case 24:
                    _e++;
                    return [3 /*break*/, 22];
                case 25:
                    // ✅ Create medication reminders for the near future
                    console.log("🕒 Creating medication reminders for the near future...");
                    now = new Date();
                    patient1ReminderTimes = [
                        new Date(now.getTime() + 5 * 60000), // 5 minutes from now
                        new Date(now.getTime() + 30 * 60000), // 30 minutes from now
                        new Date(now.getTime() + 60 * 60000), // 1 hour from now
                    ];
                    patient2ReminderTimes = [
                        new Date(now.getTime() + 15 * 60000), // 15 minutes from now
                        new Date(now.getTime() + 45 * 60000), // 45 minutes from now
                        new Date(now.getTime() + 90 * 60000), // 1.5 hours from now
                    ];
                    patient3ReminderTimes = [
                        new Date(now.getTime() + 10 * 60000), // 10 minutes from now
                        new Date(now.getTime() + 75 * 60000), // 75 minutes from now
                        new Date(now.getTime() + 120 * 60000), // 2 hours from now
                    ];
                    i = 0;
                    _f.label = 26;
                case 26:
                    if (!(i < patient1ReminderTimes.length)) return [3 /*break*/, 29];
                    return [4 /*yield*/, prisma.medicationReminder.create({
                            data: {
                                prescriptionId: prescriptions[0].id,
                                patientId: patients[0].id,
                                scheduledFor: patient1ReminderTimes[i],
                                status: client_1.ReminderStatus.scheduled,
                            },
                        })];
                case 27:
                    reminder = _f.sent();
                    console.log("\u2705 Medication reminder created for ".concat(patients[0].firstName, " at ").concat(patient1ReminderTimes[i]));
                    _f.label = 28;
                case 28:
                    i++;
                    return [3 /*break*/, 26];
                case 29:
                    i = 0;
                    _f.label = 30;
                case 30:
                    if (!(i < patient2ReminderTimes.length)) return [3 /*break*/, 33];
                    return [4 /*yield*/, prisma.medicationReminder.create({
                            data: {
                                prescriptionId: prescriptions[1].id,
                                patientId: patients[1].id,
                                scheduledFor: patient2ReminderTimes[i],
                                status: client_1.ReminderStatus.scheduled,
                            },
                        })];
                case 31:
                    reminder = _f.sent();
                    console.log("\u2705 Medication reminder created for ".concat(patients[1].firstName, " at ").concat(patient2ReminderTimes[i]));
                    _f.label = 32;
                case 32:
                    i++;
                    return [3 /*break*/, 30];
                case 33:
                    i = 0;
                    _f.label = 34;
                case 34:
                    if (!(i < patient3ReminderTimes.length)) return [3 /*break*/, 37];
                    return [4 /*yield*/, prisma.medicationReminder.create({
                            data: {
                                prescriptionId: prescriptions[2].id,
                                patientId: patients[2].id,
                                scheduledFor: patient3ReminderTimes[i],
                                status: client_1.ReminderStatus.scheduled,
                            },
                        })];
                case 35:
                    reminder = _f.sent();
                    console.log("\u2705 Medication reminder created for ".concat(patients[2].firstName, " at ").concat(patient3ReminderTimes[i]));
                    _f.label = 36;
                case 36:
                    i++;
                    return [3 /*break*/, 34];
                case 37:
                    console.log("✅ All seed data with medication reminders created successfully!");
                    console.log("📊 Summary:");
                    console.log("  - Tuteur: 1 (".concat(tuteur.email, ")"));
                    console.log("  - Patients: ".concat(patients.length));
                    console.log("  - Doctors: ".concat(doctors.length));
                    console.log("  - Medications: ".concat(medications.length));
                    console.log("  - Prescriptions: ".concat(prescriptions.length));
                    console.log("  - Patient Relationships: ".concat(patientRelationships.length));
                    console.log("  - Doctor Relationships: ".concat(doctorRelationships.length));
                    console.log("  - Medication Reminders: ".concat(patient1ReminderTimes.length + patient2ReminderTimes.length + patient3ReminderTimes.length));
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error("❌ Error while seeding database:", e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
