import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { barbersTable, servicesTable } from "@workspace/db";

const services = [
  {
    name: "Classic Cut",
    slug: "classic-cut",
    description: "A considered cut, finished with a clean neckline and hot towel detail.",
    price: 180,
    durationMinutes: 30,
  },
  {
    name: "Skin Fade",
    slug: "skin-fade",
    description: "A precise skin fade with tailored texture through the top.",
    price: 220,
    durationMinutes: 45,
  },
  {
    name: "Beard Sculpt",
    slug: "beard-sculpt",
    description: "Shape, line and soften your beard with a warm towel finish.",
    price: 120,
    durationMinutes: 20,
  },
  {
    name: "Cut & Beard",
    slug: "cut-and-beard",
    description: "The full reset: a tailored cut paired with a considered beard shape.",
    price: 280,
    durationMinutes: 60,
  },
  {
    name: "Kids’ Cut",
    slug: "kids-cut",
    description: "A patient, tidy cut for younger guests, finished at their pace.",
    price: 140,
    durationMinutes: 30,
  },
  {
    name: "Signature Grooming",
    slug: "signature-grooming",
    description: "Our complete ritual: cut, beard, hot towel and a quiet moment to reset.",
    price: 350,
    durationMinutes: 75,
  },
];

const barbers = [
  {
    name: "Mandla Ndlovu",
    specialty: "Fades & texture",
    bio: "Mandla works in clean lines and soft transitions, bringing a measured eye to every fade.",
    imageUrl:
      "https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Lena Jacobs",
    specialty: "Classic cuts & beard work",
    bio: "Lena favours timeless shapes with just enough edge, from a close crop to a sculpted beard.",
    imageUrl:
      "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Thabo Maseko",
    specialty: "Modern grooming",
    bio: "Thabo brings calm precision to modern cuts and the small finishing details people notice.",
    imageUrl:
      "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=85",
  },
];

export async function seedCatalogue(): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext('crown-blade-catalogue-seed'))`,
    );

    const existingServices = await tx
      .select({ id: servicesTable.id })
      .from(servicesTable)
      .limit(1);
    if (existingServices.length === 0) {
      await tx.insert(servicesTable).values(services);
    }

    const existingBarbers = await tx
      .select({ id: barbersTable.id })
      .from(barbersTable)
      .limit(1);
    if (existingBarbers.length === 0) {
      await tx.insert(barbersTable).values(barbers);
    }
  });
}

let catalogueReady: Promise<void> | undefined;

export function ensureCatalogueSeeded(): Promise<void> {
  catalogueReady ??= seedCatalogue().catch((error: unknown) => {
    catalogueReady = undefined;
    throw error;
  });

  return catalogueReady;
}
