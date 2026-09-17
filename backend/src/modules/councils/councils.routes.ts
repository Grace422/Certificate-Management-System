import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { listQuerySchema, nearestQuerySchema } from "./councils.validation";
import * as controller from "./councils.controller";

const router = Router();
router.use(requireAuth); // any authenticated role may look up councils

// IMPORTANT: /nearest must be registered BEFORE /:id, otherwise Express
// would match "nearest" as an :id param on the route below it.
router.get("/nearest", validate(nearestQuerySchema), controller.nearest);
router.get("/", validate(listQuerySchema), controller.list);
router.get("/:id", controller.getById);

export default router;
