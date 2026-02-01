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
  const userId = session.id; // Use session.id to get the user ID

  switch (method) {
    case "POST":
      try {
        const { name } = req.body;
        const category = await prisma.category.create({
          data: {
            name,
            userId,
          },
        });
        res.status(201).json(category);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === "P2002") {
            return res.status(400).json({
              error: "Category name must be unique per user",
            });
          }
        }
        console.error("Error creating category:", error);
        res.status(500).json({ error: "Failed to create category" });
      }
      break;
    case "GET":
      try {
        const categories = await prisma.category.findMany({
          where: { userId },
        });
        res.status(200).json(categories);
      } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ error: "Failed to fetch categories" });
      }
      break;
    case "PUT":
      try {
        const { id, name } = req.body;

        if (!id || !name) {
          return res.status(400).json({ error: "ID and name are required" });
        }

        const updateResult = await prisma.category.updateMany({
          where: { id, userId },
          data: { name },
        });

        if (updateResult.count === 0) {
          return res.status(404).json({ error: "Category not found" });
        }

        const updatedCategory = await prisma.category.findFirst({
          where: { id, userId },
        });

        res.status(200).json(updatedCategory);
      } catch (error) {
        console.error("Error updating category:", error);
        res.status(500).json({ error: "Failed to update category" });
      }
      break;
    case "DELETE":
      try {
        const { id } = req.body;
        console.log("Deleting category with ID:", id); // Debug statement

        const deleteResult = await prisma.category.deleteMany({
          where: { id, userId },
        });

        if (deleteResult.count === 0) {
          return res.status(404).json({ error: "Category not found" });
        }

        res.status(204).end();
      } catch (error) {
        console.error("Error deleting category:", error);
        res.status(500).json({ error: "Failed to delete category" });
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
