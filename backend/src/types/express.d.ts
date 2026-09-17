import { Role } from "../middlewares/auth.middleware";

// Augments Express's Request interface so `req.user` is typed
// everywhere in the app after requireAuth runs.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
        email: string;
      };
    }
  }
}

export {};
