import {
  date,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const servicesTable = pgTable("barber_services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  active: integer("active").notNull().default(1),
});

export const barbersTable = pgTable("barbers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  bio: text("bio").notNull(),
  imageUrl: text("image_url").notNull(),
  active: integer("active").notNull().default(1),
});

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  reference: text("reference").notNull().unique(),
  serviceId: integer("service_id")
    .notNull()
    .references(() => servicesTable.id),
  barberId: integer("barber_id")
    .notNull()
    .references(() => barbersTable.id),
  appointmentDate: date("appointment_date", { mode: "string" }).notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  notes: text("notes"),
  promotionCode: text("promotion_code"),
  subtotal: integer("subtotal").notNull(),
  discount: integer("discount").notNull().default(0),
  total: integer("total").notNull(),
  status: text("status").notNull().default("confirmed"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const contactMessagesTable = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertServiceSchema = createInsertSchema(servicesTable).omit({
  id: true,
});
export const insertBarberSchema = createInsertSchema(barbersTable).omit({
  id: true,
});
export const insertBookingSchema = createInsertSchema(bookingsTable).omit({
  id: true,
  createdAt: true,
});
export const insertContactMessageSchema = createInsertSchema(
  contactMessagesTable,
).omit({
  id: true,
  createdAt: true,
});

export type Service = typeof servicesTable.$inferSelect;
export type Barber = typeof barbersTable.$inferSelect;
export type Booking = typeof bookingsTable.$inferSelect;
export type ContactMessage = typeof contactMessagesTable.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertBarber = z.infer<typeof insertBarberSchema>;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;