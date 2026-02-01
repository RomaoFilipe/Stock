import { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { generateToken } from "../../../utils/auth";
import Cookies from "cookies";
import { applyRateLimit } from "../../../utils/rateLimit";
import { prisma } from "@/prisma/client";

export default async function login(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;
  const configuredOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const forwardedProto = req.headers["x-forwarded-proto"] as string | undefined;
  const forwardedHost = req.headers["x-forwarded-host"] as string | undefined;
  const host = forwardedHost || req.headers.host;
  const proto = forwardedProto || (process.env.NODE_ENV === "development" ? "http" : "https");
  const sameOrigin = Boolean(origin && host && origin === `${proto}://${host}`);

  if (origin && !sameOrigin) {
    if (configuredOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
    } else {
      return res.status(403).json({ error: "Origin not allowed" });
    }
  }

  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // Handle preflight requests
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const rate = applyRateLimit(req, res, {
    windowMs: 10 * 60 * 1000,
    max: 20,
    keyPrefix: "login",
  });
  if (!rate.ok) {
    return res.status(429).json({ error: "Too many requests" });
  }

  // Defensive: Ensure req.body is an object
  if (!req.body || typeof req.body !== "object") {
    console.error("Request body is missing or not an object", req.body);
    return res.status(400).json({ error: "Invalid request body" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    console.error("Missing email or password in request body", req.body);
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.error("User not found for email:", email);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.password) {
      console.error(
        "User found but password is missing in DB for email:",
        email
      );
      return res
        .status(500)
        .json({ error: "User data corrupted: password missing" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.error("Invalid password for email:", email);
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.id) {
      console.error("User found but id is missing in DB for email:", email);
      return res.status(500).json({ error: "User data corrupted: id missing" });
    }

    const token = generateToken(user.id);

    if (!token) {
      console.error("Failed to generate JWT token for user id:", user.id);
      return res
        .status(500)
        .json({ error: "Failed to generate session token" });
    }

    // Determine if the connection is secure
    const isSecure =
      req.headers["x-forwarded-proto"] === "https" ||
      process.env.NODE_ENV !== "development";

    const cookies = new Cookies(req, res, { secure: isSecure });
    cookies.set("session_id", token, {
      httpOnly: true,
      secure: isSecure, // Dynamically set secure flag
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.status(200).json({
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
