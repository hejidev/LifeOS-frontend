import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  createAccountSchema,
  updateAccountSchema,
  createCategorySchema,
  createBudgetSchema,
  createTransactionSchema,
  updateTransactionSchema,
  dashboardQuerySchema,
} from "../validators/finance.validator";
import * as financeController from "../controllers/finance.controller";

const router = Router();

router.get(
  "/finance/dashboard",
  requireAuth,
  validate(dashboardQuerySchema),
  financeController.getDashboard,
);

router.get("/finance/accounts", requireAuth, financeController.getAccounts);
router.post(
  "/finance/accounts",
  requireAuth,
  validate(createAccountSchema),
  financeController.createAccount,
);
router.patch(
  "/finance/accounts/:id",
  requireAuth,
  validate(updateAccountSchema),
  financeController.updateAccount,
);

router.get("/finance/categories", requireAuth, financeController.getCategories);
router.post(
  "/finance/categories",
  requireAuth,
  validate(createCategorySchema),
  financeController.createCategory,
);

router.post(
  "/finance/budgets",
  requireAuth,
  validate(createBudgetSchema),
  financeController.createBudget,
);

router.get("/finance/transactions", requireAuth, financeController.getDashboard); // reuse dashboard list
router.post(
  "/finance/transactions",
  requireAuth,
  validate(createTransactionSchema),
  financeController.createTransaction,
);
router.patch(
  "/finance/transactions/:id",
  requireAuth,
  validate(updateTransactionSchema),
  financeController.updateTransaction,
);
router.delete("/finance/transactions/:id", requireAuth, financeController.deleteTransaction);

export default router;