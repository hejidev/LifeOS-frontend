import { AppError } from "./errors";

export function assertStrongPassword(password: string) {
  const checks = [
    [password.length >= 12, "at least 12 characters"],
    [/[A-Z]/.test(password), "one uppercase letter"],
    [/[a-z]/.test(password), "one lowercase letter"],
    [/\d/.test(password), "one number"],
    [/[^A-Za-z0-9]/.test(password), "one symbol"],
  ] as const;

  const unmet = checks
    .filter(([passed]) => !passed)
    .map(([, requirement]) => requirement);

  if (unmet.length) {
    throw new AppError(
      `Password must contain ${unmet.join(", ")}.`,
      400
    );
  }
}