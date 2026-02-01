import { NextApiRequest, NextApiResponse } from "next";
import { getSessionServer } from "@/utils/auth";
import { prisma } from "@/prisma/client";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSessionServer(req, res);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { method } = req;
  const isAdmin = session.role === "ADMIN";
  const asUserIdFromQuery = typeof req.query.asUserId === "string" ? req.query.asUserId : undefined;
  const userId = isAdmin && asUserIdFromQuery ? asUserIdFromQuery : session.id;

  switch (method) {
    case "POST":
      try {
        const { name, sku, price, quantity, status, categoryId, supplierId } =
          req.body;

        // Check if SKU already exists
        const existingProduct = await prisma.product.findUnique({
          where: { sku },
        });

        if (existingProduct) {
          return res.status(400).json({ error: "SKU must be unique" });
        }

        // Use Prisma for product creation to ensure consistency
        const product = await prisma.product.create({
          data: {
            name,
            sku,
            price,
            quantity: BigInt(quantity) as any,
            status,
            userId,
            categoryId,
            supplierId,
            createdAt: new Date(),
          },
          include: {
            category: true,
            supplier: true,
          },
        });

        // Return the created product data with category and supplier names
        res.status(201).json({
          id: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          quantity: Number(product.quantity),
          status: product.status,
          userId: product.userId,
          categoryId: product.categoryId,
          supplierId: product.supplierId,
          createdAt: product.createdAt.toISOString(),
          category: product.category?.name || "Unknown",
          supplier: product.supplier?.name || "Unknown",
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to create product" });
      }
      break;

    case "GET":
      try {
        const products = await prisma.product.findMany({
          where: { userId },
          include: {
            category: true,
            supplier: true,
          },
        });

        const transformedProducts = products.map((product) => {
          return {
            ...product,
            quantity: Number(product.quantity),
            createdAt: product.createdAt.toISOString(),
            category: product.category?.name || "Desconhecida",
            supplier: product.supplier?.name || "Desconhecido",
          };
        });

        res.status(200).json(transformedProducts);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch products" });
      }
      break;

    case "PUT":
      try {
        const {
          id,
          name,
          sku,
          price,
          quantity,
          status,
          categoryId,
          supplierId,
        } = req.body;

        const updateResult = await prisma.product.updateMany({
          where: { id, userId },
          data: {
            name,
            sku,
            price,
            quantity: BigInt(quantity) as any, // Convert to BigInt for database
            status,
            categoryId,
            supplierId,
          },
        });

        if (updateResult.count === 0) {
          return res.status(404).json({ error: "Product not found" });
        }

        const updatedProduct = await prisma.product.findFirst({
          where: { id, userId },
          include: {
            category: true,
            supplier: true,
          },
        });

        if (!updatedProduct) {
          return res.status(404).json({ error: "Product not found" });
        }

        // Return the updated product data with category and supplier names
        res.status(200).json({
          id: updatedProduct.id,
          name: updatedProduct.name,
          sku: updatedProduct.sku,
          price: updatedProduct.price,
          quantity: Number(updatedProduct.quantity), // Convert BigInt to Number
          status: updatedProduct.status,
          userId: updatedProduct.userId,
          categoryId: updatedProduct.categoryId,
          supplierId: updatedProduct.supplierId,
          createdAt: updatedProduct.createdAt.toISOString(),
          category: updatedProduct.category?.name || "Unknown",
          supplier: updatedProduct.supplier?.name || "Unknown",
        });
      } catch (error) {
        res.status(500).json({ error: "Failed to update product" });
      }
      break;

    case "DELETE":
      try {
        const { id } = req.body;

        const deleteResult = await prisma.product.deleteMany({
          where: { id, userId },
        });

        if (deleteResult.count === 0) {
          return res.status(404).json({ error: "Product not found" });
        }

        res.status(204).end();
      } catch (error) {
        res.status(500).json({ error: "Failed to delete product" });
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
