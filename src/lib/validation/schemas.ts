import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const companySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  nameAr: z.string().optional(),
  commercialRegistration: z.string().optional(),
  vatNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  additionalInfo: z.string().optional(),
});

export const driverSchema = z.object({
  name: z.string().min(1, "Driver name is required"),
  nameAr: z.string().optional(),
  iqamaNumber: z.string().optional(),
  phone: z.string().optional(),
  nationality: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  notes: z.string().optional(),
  vehicleId: z.string().optional(),
});

export const vehicleSchema = z.object({
  vehicleType: z.string().min(1, "Vehicle type is required"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  plateNumber: z.string().min(1, "Plate number is required"),
  registrationNumber: z.string().optional(),
  vehicleId: z.string().optional(),
  year: z.coerce.number().optional(),
  color: z.string().optional(),
  capacity: z.coerce.number().optional(),
  status: z.enum(["AVAILABLE", "ASSIGNED", "MAINTENANCE", "INACTIVE"]).default("AVAILABLE"),
  notes: z.string().optional(),
  driverId: z.string().optional(),
});

export const passengerSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  passportNumber: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
  visaType: z.string().nullable().optional(),
  iqamaNumber: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const rideSchema = z.object({
  date: z.string().min(1, "Date is required"),
  pickup: z.string().min(1, "Pickup location is required"),
  destination: z.string().min(1, "Destination is required"),
  intermediateStops: z.string().optional(),
  tripType: z.string().optional(),
  flightNumber: z.string().optional(),
  fare: z.number().nullable().optional(),
  referral: z.string().nullable().optional(),
  notes: z.string().optional(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("SCHEDULED"),
  driverId: z.string().optional(),
  vehicleId: z.string().optional(),
  passengerIds: z.array(z.string()).default([]),
});

export const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "MANAGER", "OPERATOR"]).default("OPERATOR"),
  isActive: z.boolean().default(true),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CompanyInput = z.infer<typeof companySchema>;
export type DriverInput = z.infer<typeof driverSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type PassengerInput = z.infer<typeof passengerSchema>;
export type RideInput = z.infer<typeof rideSchema>;
export type TemplateInput = z.infer<typeof templateSchema>;
export type UserInput = z.infer<typeof userSchema>;
