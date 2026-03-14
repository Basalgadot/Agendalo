import type {
  User,
  Business,
  Professional,
  Service,
  Booking,
  BusinessSchedule,
  BlockedSlot,
  UserRole,
  BusinessPlan,
  BookingStatus,
} from "@prisma/client";

// Re-exportar tipos de Prisma para uso conveniente
export type {
  User,
  Business,
  Professional,
  Service,
  Booking,
  BusinessSchedule,
  BlockedSlot,
  UserRole,
  BusinessPlan,
  BookingStatus,
};

// Tipos extendidos con relaciones frecuentes

export type BusinessWithDetails = Business & {
  owner: User;
  professionals: Professional[];
  services: Service[];
  schedules: BusinessSchedule[];
};

export type BookingWithDetails = Booking & {
  professional: Professional;
  service: Service;
  client: User | null;
};

export type ProfessionalWithServices = Professional & {
  services: { service: Service }[];
};

// Slots de disponibilidad
export interface TimeSlot {
  startTime: string; // "10:00"
  endTime: string;   // "10:30"
  available: boolean;
}

// Respuesta estándar de API
export interface ApiResponse<T = void> {
  data?: T;
  error?: string;
  message?: string;
}
