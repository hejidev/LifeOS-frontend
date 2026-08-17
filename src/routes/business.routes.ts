import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import * as businessController from "../controllers/business.controller";
import {
  updateBizProfileSchema,
  createProductSchema,
  updateProductSchema,
  createCustomerSchema,
  createSaleSchema,
  updateSaleStatusSchema,
  createExpenseSchema,
} from "../validators/business.validator";
import { requireMerchant } from "../middlewares/merchant.middleware";

const router = Router();
router.use(requireAuth);
router.use(requireMerchant);

router.get("/dashboard", businessController.getDashboard);

router.get("/profile", businessController.getProfile);
router.patch("/profile", validate(updateBizProfileSchema), businessController.updateProfile);

router.get("/products", businessController.getProducts);
router.post("/products", validate(createProductSchema), businessController.createProduct);
router.patch("/products/:id", validate(updateProductSchema), businessController.updateProduct);
router.delete("/products/:id", businessController.deleteProduct);

router.get("/customers", businessController.getCustomers);
router.post("/customers", validate(createCustomerSchema), businessController.createCustomer);

router.get("/sales", businessController.getSales);
router.post("/sales", validate(createSaleSchema), businessController.createSale);
router.patch("/sales/:id/status", validate(updateSaleStatusSchema), businessController.updateSaleStatus);

router.get("/expenses", businessController.getExpenses);
router.post("/expenses", validate(createExpenseSchema), businessController.createExpense);
router.delete("/expenses/:id", businessController.deleteExpense);

router.get("/products/paged", businessController.getProductsPaged);

export default router;