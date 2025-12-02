// api/utils/admin.js
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const ADMIN_NAME = process.env.ADMIN_NAME || "Admin";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin"; // ⭐ ADDED

export async function ensureAdminUser() {
  try {
    const normalizedEmail = ADMIN_EMAIL.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

      user = await User.create({
        name: ADMIN_NAME,
        username: ADMIN_USERNAME, // ⭐ FIX (this was missing)
        email: normalizedEmail,
        passwordHash,
        role: "admin",
        isAdmin: true,
      });

      console.log("✅ Admin user created:", normalizedEmail);
      return user;
    }

    let updated = false;

    // ⭐ FIX: ensure username exists even for old admin
    if (!user.username) {
      user.username = ADMIN_USERNAME;
      updated = true;
      console.log("⚠️ Added missing admin username");
    }

    if (user.role !== "admin") {
      user.role = "admin";
      updated = true;
    }

    if (!user.isAdmin) {
      user.isAdmin = true;
      updated = true;
    }

    const samePassword = await bcrypt.compare(
      ADMIN_PASSWORD,
      user.passwordHash || ""
    );

    if (!samePassword) {
      user.passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      updated = true;
      console.log("🔑 Updated admin password");
    }

    if (updated) {
      await user.save();
      console.log("✅ Admin updated:", normalizedEmail);
    } else {
      console.log("ℹ️ Admin already valid");
    }

    return user;
  } catch (err) {
    console.error("❌ Failed to ensure admin user:", err);
    throw err;
  }
}
