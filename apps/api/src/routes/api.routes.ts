import { Router } from "express";
import { protect } from "../keycloak";
import { taskRouter } from "./task.routes";
import { userRouter } from "./user.routes";
import { projectRouter } from "./project.routes";
import { activityRouter } from "./activity.routes";
import { validate } from "../infra/http/middlewares/validate-request.middleware";
import { CreateKeycloakUserDto, TCreateKeycloakUserDto } from "@repo/shared";
import { withBody } from "../utils/typed-route";
import { UserController } from "../controllers/user.controller";
import { extractAuthUser } from "../infra/http/middlewares/auth.middleware";

const apiRouter = Router();
const userController = new UserController();

// Public signup: POST /api/users/with-keycloak (BEFORE protect)
apiRouter.post(
  "/users/with-keycloak",
  validate({ body: CreateKeycloakUserDto }),
  withBody<TCreateKeycloakUserDto>((req, res, next) =>
    userController.createWithKeycloak(req, res, next),
  ),
);

// Every protected route gets both middlewares:
// protect()       → validates the Keycloak token
// extractAuthUser → pulls sub into req.authUser
apiRouter.use(protect(), extractAuthUser);

// resource routers
apiRouter.use("/tasks", taskRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/projects", projectRouter);
apiRouter.use("/activity", activityRouter);

export { apiRouter };
