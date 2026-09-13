import { SystemAdminGuard } from "../../../../src/components/auth/SystemAdminGuard";

export default function EmployeesLayout({ children }: { children: React.ReactNode }) {
  return <SystemAdminGuard>{children}</SystemAdminGuard>;
}
