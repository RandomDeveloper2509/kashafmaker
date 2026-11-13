import { KashafDataContext } from "./types";
import { formatDateLong } from "../utils";

interface CompanyData {
  name: string;
  nameAr?: string | null;
  commercialRegistration?: string | null;
  vatNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  logoPath?: string | null;
}

interface DriverSnapshot {
  name?: string;
  nameAr?: string | null;
  iqamaNumber?: string | null;
  phone?: string | null;
  nationality?: string | null;
  licenseNumber?: string | null;
}

interface VehicleSnapshot {
  vehicleType?: string;
  make?: string;
  model?: string;
  plateNumber?: string;
  vehicleId?: string | null;
  color?: string | null;
  capacity?: number | null;
}

interface RideData {
  rideNumber: string;
  date: Date;
  time: string;
  pickup: string;
  destination: string;
  tripType?: string | null;
  flightNumber?: string | null;
  notes?: string | null;
}

interface PassengerSnapshot {
  fullName?: string;
  passportNumber?: string | null;
  nationality?: string | null;
  gender?: string | null;
  visaType?: string | null;
}

export function buildKashafContext(
  company: CompanyData,
  ride: RideData,
  driver: DriverSnapshot | null,
  vehicle: VehicleSnapshot | null,
  passengers: PassengerSnapshot[]
): KashafDataContext {
  return {
    company: {
      company_name: company.name,
      company_name_ar: company.nameAr || undefined,
      commercial_registration: company.commercialRegistration || undefined,
      vat_number: company.vatNumber || undefined,
      company_phone: company.phone || undefined,
      company_email: company.email || undefined,
      company_address: company.address || undefined,
      company_city: company.city || undefined,
      company_country: company.country || undefined,
      company_logo: company.logoPath || undefined,
    },
    ride: {
      ride_number: ride.rideNumber,
      date: formatDateLong(ride.date),
      time: ride.time,
      pickup: ride.pickup,
      destination: ride.destination,
      trip_type: ride.tripType || undefined,
      flight_number: ride.flightNumber || undefined,
      notes: (ride.notes && ride.notes.trim()) ? ride.notes : `${ride.pickup} to ${ride.destination}`,
      datetime: formatDateLong(ride.date),
    },
    driver: driver
      ? {
          driver_name: driver.name,
          driver_name_ar: driver.nameAr || undefined,
          iqama_number: driver.iqamaNumber || undefined,
          driver_phone: driver.phone || undefined,
          nationality: driver.nationality || undefined,
          license_number: driver.licenseNumber || undefined,
        }
      : {},
    vehicle: vehicle
      ? {
          vehicle_type: vehicle.vehicleType,
          vehicle_make: vehicle.make,
          vehicle_model: vehicle.model,
          plate_number: vehicle.plateNumber,
          vehicle_id: vehicle.vehicleId || undefined,
          vehicle_color: vehicle.color || undefined,
          vehicle_capacity: vehicle.capacity?.toString(),
          vehicle_display: [vehicle.make, vehicle.model].filter(Boolean).join(" "),
        }
      : {},
    passengers: passengers.map((p) => ({
      passenger_name: p.fullName,
      passport_number: p.passportNumber || undefined,
      nationality: p.nationality || undefined,
      gender: p.gender || undefined,
      visa_type: p.visaType || undefined,
    })),
    third_party: passengers.length > 0 
      ? `${passengers[0].fullName}${passengers.length > 1 ? ` and ${passengers.length - 1} others` : ''}`
      : undefined,
  };
}

export function createDriverSnapshot(driver: {
  name: string;
  nameAr?: string | null;
  iqamaNumber?: string | null;
  phone?: string | null;
  nationality?: string | null;
  licenseNumber?: string | null;
}): DriverSnapshot {
  return {
    name: driver.name,
    nameAr: driver.nameAr,
    iqamaNumber: driver.iqamaNumber,
    phone: driver.phone,
    nationality: driver.nationality,
    licenseNumber: driver.licenseNumber,
  };
}

export function createVehicleSnapshot(vehicle: {
  vehicleType: string;
  make: string;
  model: string;
  plateNumber: string;
  vehicleId?: string | null;
  color?: string | null;
  capacity?: number | null;
}): VehicleSnapshot {
  return {
    vehicleType: vehicle.vehicleType,
    make: vehicle.make,
    model: vehicle.model,
    plateNumber: vehicle.plateNumber,
    vehicleId: vehicle.vehicleId,
    color: vehicle.color,
    capacity: vehicle.capacity,
  };
}

export function createPassengerSnapshot(passenger: {
  fullName: string;
  passportNumber?: string | null;
  nationality?: string | null;
  gender?: string | null;
  visaType?: string | null;
}): PassengerSnapshot {
  return {
    fullName: passenger.fullName,
    passportNumber: passenger.passportNumber,
    nationality: passenger.nationality,
    gender: passenger.gender,
    visaType: passenger.visaType,
  };
}
