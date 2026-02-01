import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { IncomingForm } from "formidable";
import { prisma } from "@/prisma/client";
import { getSessionServer } from "@/utils/auth";

export const config = {
  api: {
    bodyParser: false,
  },
};

const kindSchema = z.enum(["INVOICE", "REQUEST", "DOCUMENT", "OTHER"]);

const ensureDir = async (dir: string) => {
  await fs.promises.mkdir(dir, { recursive: true });
};

const toSafeFileName = (name: string) => {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return base || "file";
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSessionServer(req, res);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const userId = session.id;

  if (req.method === "GET") {
    const kind = req.query.kind;
    if (typeof kind !== "string") {
      return res.status(400).json({ error: "kind is required" });
    }
    const parsedKind = kindSchema.safeParse(kind);
    if (!parsedKind.success) {
      return res.status(400).json({ error: "Invalid kind" });
    }

    const invoiceId = typeof req.query.invoiceId === "string" ? req.query.invoiceId : undefined;
    const requestId = typeof req.query.requestId === "string" ? req.query.requestId : undefined;

    try {
      const files = await prisma.storedFile.findMany({
        where: {
          userId,
          kind: parsedKind.data,
          invoiceId: invoiceId ?? undefined,
          requestId: requestId ?? undefined,
        },
        orderBy: { createdAt: "desc" },
      });

      return res.status(200).json(
        files.map((f) => ({
          ...f,
          createdAt: f.createdAt.toISOString(),
          updatedAt: f.updatedAt.toISOString(),
        }))
      );
    } catch (error) {
      console.error("GET /api/storage error:", error);
      return res.status(500).json({ error: "Failed to fetch files" });
    }
  }

  if (req.method === "POST") {
    const form = new IncomingForm({
      multiples: false,
      maxFileSize: 25 * 1024 * 1024, // 25MB
    });

    try {
      const { fields, files } = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err);
          resolve({ fields, files });
        });
      });

      const kindValue = Array.isArray(fields.kind) ? fields.kind[0] : fields.kind;
      const parsedKind = kindSchema.safeParse(kindValue);
      if (!parsedKind.success) {
        return res.status(400).json({ error: "Invalid kind" });
      }

      const invoiceId = Array.isArray(fields.invoiceId) ? fields.invoiceId[0] : fields.invoiceId;
      const requestId = Array.isArray(fields.requestId) ? fields.requestId[0] : fields.requestId;

      // Only allow linking IDs when kind matches
      if (invoiceId && parsedKind.data !== "INVOICE") {
        return res.status(400).json({ error: "invoiceId only allowed for INVOICE kind" });
      }
      if (requestId && parsedKind.data !== "REQUEST") {
        return res.status(400).json({ error: "requestId only allowed for REQUEST kind" });
      }

      const upload = (files.file ?? files.upload ?? files.document) as any;
      if (!upload) {
        return res.status(400).json({ error: "file is required" });
      }

      const file = Array.isArray(upload) ? upload[0] : upload;
      const tempPath: string = file.filepath;
      const originalName: string = file.originalFilename || "file";
      const mimeType: string = file.mimetype || "application/octet-stream";
      const sizeBytes: number = Number(file.size || 0);

      if (!tempPath || !fs.existsSync(tempPath)) {
        return res.status(400).json({ error: "Invalid upload" });
      }

      // Validate ownership of linked entities
      if (invoiceId) {
        const inv = await prisma.productInvoice.findFirst({
          where: { id: String(invoiceId), userId },
          select: { id: true },
        });
        if (!inv) return res.status(404).json({ error: "Invoice not found" });
      }
      if (requestId) {
        const reqRow = await prisma.request.findFirst({
          where: { id: String(requestId), userId },
          select: { id: true },
        });
        if (!reqRow) return res.status(404).json({ error: "Request not found" });
      }

      const safeOriginal = toSafeFileName(originalName);
      const ext = path.extname(safeOriginal).slice(0, 16);
      const id = crypto.randomUUID();

      const userDir = path.join(process.cwd(), "storage", userId);
      await ensureDir(userDir);

      const fileName = `${id}${ext}`;
      const destPath = path.join(userDir, fileName);
      await fs.promises.rename(tempPath, destPath);

      const created = await prisma.storedFile.create({
        data: {
          id,
          userId,
          kind: parsedKind.data,
          originalName: safeOriginal,
          fileName,
          mimeType,
          sizeBytes,
          storagePath: path.relative(process.cwd(), destPath),
          invoiceId: invoiceId ? String(invoiceId) : undefined,
          requestId: requestId ? String(requestId) : undefined,
        },
      });

      return res.status(201).json({
        ...created,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      });
    } catch (error: any) {
      console.error("POST /api/storage error:", error);
      const message = typeof error?.message === "string" ? error.message : "Upload failed";
      return res.status(500).json({ error: message });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}
