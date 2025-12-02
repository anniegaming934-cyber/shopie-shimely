// api/utils/auth.js
import jwt from "jsonwebtoken";

export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = "7d";

export function createToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role || "user",
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}
