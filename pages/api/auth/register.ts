import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { applyRateLimit } from "../../../utils/rateLimit";
import { prisma } from "@/prisma/client";

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (process.env.ALLOW_REGISTRATION !== "true") {
    return res.status(410).json({
      error: "Registration is disabled. Ask an administrator to create your account.",
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const rate = applyRateLimit(req, res, {
    windowMs: 10 * 60 * 1000,
    max: 10,
    keyPrefix: "register",
  });
  if (!rate.ok) {
    return res.status(429).json({ error: "Too many requests" });
  }

  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate a unique username (optional field, but unique if present)
    const baseUsername = (email.split("@")[0] || "user")
      .toLowerCase()
      .replace(/[^a-z0-9_\-.]/g, "")
      .slice(0, 30);

    let username: string | undefined = baseUsername || undefined;
    if (username) {
      let counter = 1;
      // Ensure uniqueness in Prisma
      while (await prisma.user.findUnique({ where: { username } })) {
        const suffix = String(counter);
        username = `${baseUsername.slice(0, 30 - suffix.length)}${suffix}`;
        counter += 1;
      }
    }

    const createdUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        username,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return res.status(201).json(createdUser);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    console.error("Register error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
