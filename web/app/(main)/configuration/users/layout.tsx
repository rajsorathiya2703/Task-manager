import { SystemAdminGuard } from "../../../../src/components/auth/SystemAdminGuard";

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return <SystemAdminGuard>{children}</SystemAdminGuard>;
}
