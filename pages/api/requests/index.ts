import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/prisma/client";
import { getSessionServer } from "@/utils/auth";

const createRequestSchema = z.object({
  asUserId: z.string().uuid().optional(),
  title: z.string().min(1).max(120).optional(),
  notes: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
        notes: z.string().max(500).optional(),
      })
    )
    .min(1),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionServer(req, res);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const isAdmin = session.role === "ADMIN";
  const asUserIdFromQuery = typeof req.query.asUserId === "string" ? req.query.asUserId : undefined;
  const userId = isAdmin && asUserIdFromQuery ? asUserIdFromQuery : session.id;

  if (req.method === "GET") {
    try {
      const requests = await prisma.request.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          invoices: {
            select: {
              id: true,
              invoiceNumber: true,
              issuedAt: true,
              productId: true,
            },
            orderBy: { issuedAt: "desc" },
          },
          items: {
            include: {
              product: { select: { id: true, name: true, sku: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      return res.status(200).json(
        requests.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          invoices: r.invoices.map((inv) => ({
            ...inv,
            issuedAt: inv.issuedAt.toISOString(),
          })),
          items: r.items.map((it) => ({
            ...it,
            quantity: Number(it.quantity),
            createdAt: it.createdAt.toISOString(),
            updatedAt: it.updatedAt.toISOString(),
          })),
        }))
      );
    } catch (error) {
      console.error("GET /api/requests error:", error);
      return res.status(500).json({ error: "Failed to fetch requests" });
    }
  }

  if (req.method === "POST") {
    const parsed = createRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const { asUserId, title, notes, items } = parsed.data;
    const createForUserId = isAdmin && asUserId ? asUserId : session.id;

    try {
      // Ensure all products belong to the user
      const uniqueProductIds = Array.from(new Set(items.map((i) => i.productId)));
      const products = await prisma.product.findMany({
        where: { userId: createForUserId, id: { in: uniqueProductIds } },
        select: { id: true },
      });
      const allowed = new Set(products.map((p) => p.id));

      const firstInvalid = items.find((i) => !allowed.has(i.productId));
      if (firstInvalid) {
        return res.status(404).json({ error: "One or more products were not found" });
      }

      const created = await prisma.request.create({
        data: {
          userId: createForUserId,
          createdByUserId: session.id,
          title,
          notes,
          status: "SUBMITTED",
          items: {
            create: items.map((i) => ({
              productId: i.productId,
              quantity: BigInt(i.quantity) as any,
              notes: i.notes,
            })),
          },
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          items: {
            include: { product: { select: { id: true, name: true, sku: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      return res.status(201).json({
        ...created,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
        items: created.items.map((it) => ({
          ...it,
          quantity: Number(it.quantity),
          createdAt: it.createdAt.toISOString(),
          updatedAt: it.updatedAt.toISOString(),
        })),
      });
    } catch (error) {
      console.error("POST /api/requests error:", error);
      return res.status(500).json({ error: "Failed to create request" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}
