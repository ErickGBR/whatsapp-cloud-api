import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model";

const JWT_SECRET = process.env.JWT_SECRET || "whatsapp-bot-dev-secret-key-change-in-production";

export interface AuthRequest extends Request {
  user?: User;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    const user = await User.findByPk(decoded.id);
    if (!user || !user.active) {
      res.status(401).json({ error: "Invalid or inactive user" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

export const allowRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
};
