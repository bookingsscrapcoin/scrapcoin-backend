import { Router } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdmin } from "../middleware/requireAdmin.js";
import {
  getBookingById,
  getBookings,
  saveBooking,
  updateBookingStatus,
} from "../db/store.js";

const bookingSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[+\d\s\-()]{10,20}$/),
  society: z.string().trim().min(3).max(200),
  tower: z.string().trim().max(120).optional(),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  materials: z.array(z.string().trim().min(1)).min(1),
});

const statusSchema = z.object({
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]),
});

export const bookingsRouter = Router();

// GET /api/bookings � list all bookings (admin only)
bookingsRouter.get("/", requireAdmin, async (_req, res) => {
  try {
    const bookings = await getBookings();
    return res.json(bookings);
  } catch {
    return res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// POST /api/bookings � create a new booking (public)
bookingsRouter.post("/", async (req, res) => {
  const parsed = bookingSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid booking payload",
      details: parsed.error.flatten(),
    });
  }
  const now = new Date().toISOString();
  try {
    const booking = await saveBooking({
      id: randomUUID(),
      ...parsed.data,
      status: "scheduled",
      createdAt: now,
      updatedAt: now,
    });
    return res.status(201).json({
      message: "Pickup scheduled. WhatsApp confirmation will follow shortly.",
      booking,
    });
  } catch {
    return res.status(500).json({ error: "Failed to save booking" });
  }
});

// GET /api/bookings/:id — get single booking (admin only)
bookingsRouter.get("/:id", requireAdmin, async (req, res) => {
  try {
    const booking = await getBookingById(String(req.params.id));
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    return res.json(booking);
  } catch {
    return res.status(500).json({ error: "Failed to fetch booking" });
  }
});

// PATCH /api/bookings/:id — update booking status (admin only)
bookingsRouter.patch("/:id", requireAdmin, async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid status value",
      details: parsed.error.flatten(),
    });
  }
  try {
    const booking = await updateBookingStatus(
      String(req.params.id),
      parsed.data.status
    );
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    return res.json(booking);
  } catch {
    return res.status(500).json({ error: "Failed to update booking status" });
  }
});
