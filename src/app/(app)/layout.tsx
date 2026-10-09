import { getCurrentUser } from '@/lib/auth';
import { Sidebar } from '@/components/app-sidebar';
import { Header } from '@/components/app-header';
import { getOverdueCount } from '@/lib/reminders';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const overdueCount = await getOverdueCount(user.id);

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex text-white">
      <Sidebar user={user} overdueCount={overdueCount} />
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-6 sm:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
