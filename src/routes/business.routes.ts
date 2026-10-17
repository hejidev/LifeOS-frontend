import { Router } from "express";
import multer from "multer";
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
  updateCustomerSchema,
} from "../validators/business.validator";
import { requireMerchant } from "../middlewares/merchant.middleware";

import { sendCustomerMessageSchema } from "../validators/customer-messaging.validator";
import * as customerMessagingController from "../controllers/customer-messaging.controller";
import * as analyticsController from "../controllers/analytics.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.mimetype)) return cb(new Error("Only image files are allowed"));
    cb(null, true);
  },
});

const router = Router();
router.use(requireAuth);
router.use(requireMerchant);

router.get("/dashboard", businessController.getDashboard);

router.get("/profile", businessController.getProfile);
router.patch("/profile", validate(updateBizProfileSchema), businessController.updateProfile);

router.get("/products", businessController.getProducts);
router.get("/products/by-barcode/:barcode", businessController.getProductByBarcode);
router.post("/products", validate(createProductSchema), businessController.createProduct);
router.post("/products/upload-image", upload.single("file"), businessController.uploadProductImage);
router.post("/products/bulk-import", businessController.bulkImportProducts);
router.patch("/products/:id", validate(updateProductSchema), businessController.updateProduct);
router.delete("/products/:id", businessController.deleteProduct);

router.get("/customers", businessController.getCustomers);
router.post("/customers", validate(createCustomerSchema), businessController.createCustomer);

router.post("/customers/message", validate(sendCustomerMessageSchema), customerMessagingController.sendMessage);
router.patch("/customers/:id", validate(updateCustomerSchema), businessController.updateCustomer);

router.get("/sales", businessController.getSales);
router.post("/sales", validate(createSaleSchema), businessController.createSale);
router.patch("/sales/:id/status", validate(updateSaleStatusSchema), businessController.updateSaleStatus);

router.get("/expenses", businessController.getExpenses);
router.post("/expenses", validate(createExpenseSchema), businessController.createExpense);
router.delete("/expenses/:id", businessController.deleteExpense);

router.get("/products/paged", businessController.getProductsPaged);

router.get("/products/export", businessController.exportProducts);
router.get("/sales/export", businessController.exportSales);
router.get("/customers/export", businessController.exportCustomers);

router.get("/analytics", analyticsController.getAnalytics);

export default router;