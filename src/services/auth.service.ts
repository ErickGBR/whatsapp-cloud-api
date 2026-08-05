import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";
import { ActivityLog } from "../models/activity-log.model";
import { getAdminCredentials, getJwtSecret } from "../config/env";

// Fail-fast (SEC-001): throws at import time in production if JWT_SECRET is
// missing — no public fallback is ever used in production.
const JWT_SECRET = getJwtSecret();

export class AuthService {
  /**
   * Authenticate user credentials and return JWT + user data.
   */
  async login(email: string, password: string): Promise<{ token: string; user: Partial<User> }> {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error("Invalid credentials");
    }

    if (!user.active) {
      throw new Error("Account is deactivated");
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Log activity
    await ActivityLog.create({
      userId: user.id,
      action: "login",
    });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        active: user.active,
        lastLogin: user.lastLogin,
        socketStatus: user.socketStatus,
      },
    };
  }

  /**
   * Seed default admin user if none exists.
   * Credentials come from ADMIN_EMAIL + ADMIN_PASSWORD (SEC-002). In
   * production both are mandatory (throws if missing) — the public
   * admin123 default is NEVER used in production.
   */
  async seedAdmin(): Promise<User | null> {
    const { email, password } = getAdminCredentials();
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return null;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await User.create({
      name: "Admin",
      email,
      password: hashedPassword,
      role: "admin",
      active: true,
    });

    return admin;
  }

  /**
   * Seed the demo support user if it does not exist (SEC-DEMO).
   * Only called when isDemoMode() is true (see server.ts). The credentials
   * are public demo values meant to be shown on the login page — they are
   * NEVER exposed outside demo mode.
   */
  async ensureDemoCredentials(): Promise<User | null> {
    const email = "support@demo.com";
    const password = "support123";
    const existing = await User.findOne({ where: { email } });
    if (existing) return null;
    const hashed = await bcrypt.hash(password, 10);
    return User.create({ name: "Demo Support", email, password: hashed, role: "support", active: true });
  }

  /**
   * Create a new user with hashed password.
   */
  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role?: string;
    phone?: string;
  }): Promise<User> {
    const existing = await User.findOne({ where: { email: data.email } });
    if (existing) {
      throw new Error("A user with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await User.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role || "support",
      phone: data.phone,
      active: true,
    });

    return user;
  }
}

export const authService = new AuthService();
