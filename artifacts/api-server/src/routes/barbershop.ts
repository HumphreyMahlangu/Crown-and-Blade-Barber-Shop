import { randomBytes } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, asc, eq, sql } from "drizzle-orm";
import {
  Availability,
  CreateBookingBody,
  CreateBookingResponse,
  GetAvailabilityQueryParams,
  GetAvailabilityResponse,
  ListBarbersResponse,
  ListServicesResponse,
  SubmitContactBody,
  SubmitContactResponse,
  ValidatePromotionBody,
  ValidatePromotionResponse,
} from "@workspace/api-zod";
import {
  barbersTable,
  bookingsTable,
  contactMessagesTable,
  db,
  servicesTable,
} from "@workspace/db";

const router: IRouter = Router();
const BUSINESS_TIMEZONE = "Africa/Johannesburg";
const LOCATION = "CROWN & BLADE, Cape Town, South Africa";
const PROMOTION_CODE = "FIRSTCUT10";
const PROMOTION_PERCENT = 10;

function getLocalNow(): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
}

function minutesFromTime(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function timeFromMinutes(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function getOpeningHours(dateValue: string): { open: number; close: number } | null {
  const weekday = new Date(`${dateValue}T12:00:00Z`).getUTCDay();
  if (weekday === 0) return null;
  if (weekday === 6) return { open: 8 * 60, close: 16 * 60 };
  return { open: 9 * 60, close: 18 * 60 };
}

function validateDateAndTime(
  dateValue: string,
  time: string,
  durationMinutes: number,
): string | null {
  const today = getLocalNow();
  if (dateValue < today.date) return "Please choose a date that has not passed.";
  const openingHours = getOpeningHours(dateValue);
  if (!openingHours) return "We are closed on Sundays.";
  const start = minutesFromTime(time);
  if (!Number.isFinite(start) || start % 15 !== 0) {
    return "Please choose a valid appointment time.";
  }
  if (dateValue === today.date && start <= today.minutes) {
    return "Please choose a time later today.";
  }
  if (start < openingHours.open || start + durationMinutes > openingHours.close) {
    return "That appointment would fall outside our opening hours.";
  }
  return null;
}

function isPromotionValid(code: string | null | undefined): boolean {
  return code?.trim().toUpperCase() === PROMOTION_CODE;
}

function normalisePhone(value: string): string {
  return value.replace(/[\s()-]/g, "");
}

function isValidSouthAfricanPhone(value: string): boolean {
  const normalised = normalisePhone(value);
  return /^(?:0[1-9]\d{8}|\+27[1-9]\d{8})$/.test(normalised);
}

function normaliseBookingBody(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const candidate = { ...(body as Record<string, unknown>) };
  for (const key of ["customerName", "customerEmail", "customerPhone"]) {
    if (typeof candidate[key] === "string") candidate[key] = candidate[key].trim();
  }
  return candidate;
}

function toPublicService(service: typeof servicesTable.$inferSelect) {
  return {
    id: service.id,
    name: service.name,
    slug: service.slug,
    description: service.description,
    price: service.price,
    durationMinutes: service.durationMinutes,
  };
}

function toPublicBarber(barber: typeof barbersTable.$inferSelect) {
  return {
    id: barber.id,
    name: barber.name,
    specialty: barber.specialty,
    bio: barber.bio,
    imageUrl: barber.imageUrl,
  };
}

router.get("/services", async (_req, res): Promise<void> => {
  const services = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.active, 1))
    .orderBy(asc(servicesTable.id));
  res.json(ListServicesResponse.parse(services.map(toPublicService)));
});

router.get("/barbers", async (_req, res): Promise<void> => {
  const barbers = await db
    .select()
    .from(barbersTable)
    .where(eq(barbersTable.active, 1))
    .orderBy(asc(barbersTable.id));
  res.json(ListBarbersResponse.parse(barbers.map(toPublicBarber)));
});

router.get("/availability", async (req, res): Promise<void> => {
  const parsed = GetAvailabilityQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Choose a service, barber and valid date." });
    return;
  }

  const { serviceId, barberId, date } = parsed.data;
  const [service, barber] = await Promise.all([
    db.select().from(servicesTable).where(and(eq(servicesTable.id, serviceId), eq(servicesTable.active, 1))),
    db.select().from(barbersTable).where(and(eq(barbersTable.id, barberId), eq(barbersTable.active, 1))),
  ]);
  if (!service[0] || !barber[0]) {
    res.status(400).json({ error: "That service or barber is no longer available." });
    return;
  }

  const openingHours = getOpeningHours(date);
  if (!openingHours || date < getLocalNow().date) {
    res.json(
      GetAvailabilityResponse.parse({
        date,
        serviceId,
        barberId,
        isClosed: true,
        times: [],
      }),
    );
    return;
  }

  const bookings = await db
    .select({
      startTime: bookingsTable.startTime,
      endTime: bookingsTable.endTime,
    })
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.barberId, barberId),
        eq(bookingsTable.appointmentDate, date),
        eq(bookingsTable.status, "confirmed"),
      ),
    );
  const bookedRanges = bookings.map((booking) => [
    minutesFromTime(booking.startTime),
    minutesFromTime(booking.endTime),
  ]);
  const today = getLocalNow();
  const times: string[] = [];
  for (
    let start = openingHours.open;
    start + service[0].durationMinutes <= openingHours.close;
    start += 15
  ) {
    if (date === today.date && start <= today.minutes) continue;
    const end = start + service[0].durationMinutes;
    const overlaps = bookedRanges.some(([bookedStart, bookedEnd]) => start < bookedEnd && end > bookedStart);
    if (!overlaps) times.push(timeFromMinutes(start));
  }

  res.json(
    GetAvailabilityResponse.parse({
      date,
      serviceId,
      barberId,
      isClosed: false,
      times,
    }),
  );
});

router.post("/promotions/validate", async (req, res): Promise<void> => {
  const parsed = ValidatePromotionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter a promotion code." });
    return;
  }
  if (!isPromotionValid(parsed.data.code)) {
    res.status(400).json({ error: "That promotion code is not valid." });
    return;
  }
  res.json(
    ValidatePromotionResponse.parse({
      valid: true,
      code: PROMOTION_CODE,
      discountPercent: PROMOTION_PERCENT,
      message: "First-visit offer: 10% off has been applied to this booking.",
    }),
  );
});

router.post("/bookings", async (req, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(normaliseBookingBody(req.body));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    const fieldMessages: Record<string, string> = {
      customerName: "Enter your name.",
      customerEmail: "Enter a valid email address.",
      customerPhone: "Enter a valid South African phone number, for example 082 123 4567 or +27 82 123 4567.",
    };
    res.status(400).json({ error: fieldMessages[String(field)] ?? "Please check your booking details and try again." });
    return;
  }
  const input = parsed.data;
  if (!isValidSouthAfricanPhone(input.customerPhone)) {
    res.status(400).json({ error: "Enter a valid South African phone number, for example 082 123 4567 or +27 82 123 4567." });
    return;
  }
  const normalizedPhone = normalisePhone(input.customerPhone);
  const [service, barber] = await Promise.all([
    db.select().from(servicesTable).where(and(eq(servicesTable.id, input.serviceId), eq(servicesTable.active, 1))),
    db.select().from(barbersTable).where(and(eq(barbersTable.id, input.barberId), eq(barbersTable.active, 1))),
  ]);
  if (!service[0] || !barber[0]) {
    res.status(400).json({ error: "That service or barber is no longer available." });
    return;
  }

  const timeError = validateDateAndTime(input.date, input.time, service[0].durationMinutes);
  if (timeError) {
    res.status(400).json({ error: timeError });
    return;
  }
  const start = minutesFromTime(input.time);
  const end = start + service[0].durationMinutes;
  const endTime = timeFromMinutes(end);
  const discount = isPromotionValid(input.promotionCode)
    ? Math.round(service[0].price * PROMOTION_PERCENT / 100)
    : 0;
  const reference = `CB-${input.date.replaceAll("-", "")}-${randomBytes(3).toString("hex").toUpperCase()}`;

  try {
    const confirmation = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${String(input.barberId)} || ${input.date}))`,
      );
      const existing = await tx
        .select({
          startTime: bookingsTable.startTime,
          endTime: bookingsTable.endTime,
        })
        .from(bookingsTable)
        .where(
          and(
            eq(bookingsTable.barberId, input.barberId),
            eq(bookingsTable.appointmentDate, input.date),
            eq(bookingsTable.status, "confirmed"),
          ),
        );
      const overlaps = existing.some((booking) => {
        const bookedStart = minutesFromTime(booking.startTime);
        const bookedEnd = minutesFromTime(booking.endTime);
        return start < bookedEnd && end > bookedStart;
      });
      if (overlaps) {
        throw new Error("SLOT_UNAVAILABLE");
      }

      await tx.insert(bookingsTable).values({
        reference,
        serviceId: input.serviceId,
        barberId: input.barberId,
        appointmentDate: input.date,
        startTime: input.time,
        endTime,
        customerName: input.customerName.trim(),
        customerEmail: input.customerEmail.trim().toLowerCase(),
        customerPhone: normalizedPhone,
        notes: input.notes?.trim() || null,
        promotionCode: discount > 0 ? PROMOTION_CODE : null,
        subtotal: service[0].price,
        discount,
        total: service[0].price - discount,
        status: "confirmed",
      });

      return {
        reference,
        service: toPublicService(service[0]),
        barber: toPublicBarber(barber[0]),
        customerName: input.customerName.trim(),
        customerEmail: input.customerEmail.trim().toLowerCase(),
        customerPhone: normalizedPhone,
        date: input.date,
        time: input.time,
        endTime,
        durationMinutes: service[0].durationMinutes,
        location: LOCATION,
        subtotal: service[0].price,
        discount,
        total: service[0].price - discount,
        promotionCode: discount > 0 ? PROMOTION_CODE : null,
      };
    });

    res.status(201).json(CreateBookingResponse.parse(confirmation));
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_UNAVAILABLE") {
      res.status(409).json({ error: "That time was just booked. Please choose another available time." });
      return;
    }
    throw error;
  }
});

router.post("/contact", async (req, res): Promise<void> => {
  const parsed = SubmitContactBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please check your name, email and message." });
    return;
  }
  await db.insert(contactMessagesTable).values({
    name: parsed.data.name.trim(),
    email: parsed.data.email.trim().toLowerCase(),
    message: parsed.data.message.trim(),
  });
  res.status(201).json(
    SubmitContactResponse.parse({
      received: true,
      message: "Thanks for getting in touch. We’ve received your message.",
    }),
  );
});

export default router;