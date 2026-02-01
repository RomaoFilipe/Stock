import { NextApiRequest, NextApiResponse } from "next";
import { getSessionServer } from "@/utils/auth";
import { prisma } from "@/prisma/client";
import { Prisma } from "@prisma/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSessionServer(req, res);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { method } = req;
  const asUserId = typeof req.query.asUserId === "string" ? req.query.asUserId : undefined;
  const userId = session.role === "ADMIN" && asUserId ? asUserId : session.id;

  switch (method) {
    case "POST":
      try {
        const { name } = req.body;
        const supplier = await prisma.supplier.create({
          data: {
            name,
            userId,
          },
        });
        res.status(201).json(supplier);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === "P2002") {
            return res.status(400).json({
              error: "Supplier name must be unique per user",
            });
          }
        }
        console.error("Error creating supplier:", error);
        res.status(500).json({ error: "Failed to create supplier" });
      }
      break;
    case "GET":
      try {
        const suppliers = await prisma.supplier.findMany({
          where: { userId },
        });
        res.status(200).json(suppliers);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        res.status(500).json({ error: "Failed to fetch suppliers" });
      }
      break;
    case "PUT":
      try {
        const { id, name } = req.body;

        if (!id || !name) {
          return res.status(400).json({ error: "ID and name are required" });
        }

        const updateResult = await prisma.supplier.updateMany({
          where: { id, userId },
          data: { name },
        });

        if (updateResult.count === 0) {
          return res.status(404).json({ error: "Supplier not found" });
        }

        const updatedSupplier = await prisma.supplier.findFirst({
          where: { id, userId },
        });

        res.status(200).json(updatedSupplier);
      } catch (error) {
        console.error("Error updating supplier:", error);
        res.status(500).json({ error: "Failed to update supplier" });
      }
      break;
    case "DELETE":
      try {
        const { id } = req.body;

        const deleteResult = await prisma.supplier.deleteMany({
          where: { id, userId },
        });

        if (deleteResult.count === 0) {
          return res.status(404).json({ error: "Supplier not found" });
        }

        res.status(204).end();
      } catch (error) {
        console.error("Error deleting supplier:", error);
        res.status(500).json({ error: "Failed to delete supplier" });
      }
      break;
    default:
      res.setHeader("Allow", ["POST", "GET", "PUT", "DELETE"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}

export const config = {
  api: {
    externalResolver: true,
  },
};
