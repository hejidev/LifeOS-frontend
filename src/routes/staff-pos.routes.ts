import { Router } from "express";
import { requireStaffSession } from "../middlewares/staff-session.middleware";
import { requireStaffPermission } from "../middlewares/staff-permission.middleware";
import { validate } from "../middlewares/validate.middleware";
import { createSaleSchema, createCustomerSchema } from "../validators/business.validator";
import * as staffPosController from "../controllers/staff-pos.controller";

const router = Router();
router.use(requireStaffSession);

router.get("/products", staffPosController.getProducts);
router.get("/products/by-barcode/:barcode", staffPosController.getProductByBarcode);
router.get("/customers", staffPosController.getCustomers);
router.post("/customers", validate(createCustomerSchema), requireStaffPermission("CREATE_CUSTOMER"), staffPosController.createCustomer);
router.post("/sales", validate(createSaleSchema), requireStaffPermission("CREATE_SALE"), staffPosController.createSale);

export default router;