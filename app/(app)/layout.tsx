import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getEmergencyMode } from "@/lib/repos";
import { EmergencyProvider } from "@/lib/EmergencyContext";
import { TopNav } from "@/components/layout/TopNav";
import { BottomTabs } from "@/components/layout/BottomTabs";
import { EmergencyBanner } from "@/components/layout/EmergencyBanner";
import { OfflineIndicator } from "@/components/layout/OfflineIndicator";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?clearSession=1");
  const mode = await getEmergencyMode();

  return (
    <EmergencyProvider mode={mode}>
      <div className="flex min-h-screen flex-col">
        <TopNav nickname={user.nickname} />
        <EmergencyBanner />
        <OfflineIndicator />
        <main className="flex-1">{children}</main>
        <BottomTabs />
      </div>
    </EmergencyProvider>
  );
}
