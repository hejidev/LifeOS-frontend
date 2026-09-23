export type StaffPermission = "CREATE_SALE" | "CREATE_CUSTOMER";

const ROLE_PERMISSIONS: Record<string, StaffPermission[]> = {
  MANAGER: ["CREATE_SALE", "CREATE_CUSTOMER"],
  CASHIER: ["CREATE_SALE", "CREATE_CUSTOMER"],
  SALES_REP: ["CREATE_SALE", "CREATE_CUSTOMER"],
  INVENTORY_CLERK: [],
};

export function staffHasPermission(role: string, permission: StaffPermission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getStaffPermissions(role: string): StaffPermission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}