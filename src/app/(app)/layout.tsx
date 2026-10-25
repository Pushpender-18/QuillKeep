import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { getFastSession } from '@/lib/auth';
import { Sidebar } from '@/components/app-sidebar';
import { Header } from '@/components/app-header';
import { LayoutHotkeysProvider } from '@/components/layout-hotkeys-provider';
import NextTopLoader from 'nextjs-toploader';
import {
  SidebarUserProfile,
  SidebarUserFallback,
  SidebarTaskBadge,
} from '@/components/sidebar-user-section';
import {
  HeaderNotificationSection,
  HeaderNotificationFallback,
} from '@/components/header-notification-section';

const DynamicCommandPalette = dynamic(
  () => import('@/components/command-palette').then((mod) => ({ default: mod.CommandPalette }))
);

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fast session check (claims verification only, no Prisma db query)
  await getFastSession();

  return (
    <LayoutHotkeysProvider>
      <NextTopLoader color="#0A84FF" showSpinner={false} height={2} />
      <div className="min-h-screen bg-app flex text-app transition-colors duration-150">
        <Sidebar
          taskBadge={
            <Suspense fallback={null}>
              <SidebarTaskBadge />
            </Suspense>
          }
          userProfile={
            <Suspense fallback={<SidebarUserFallback />}>
              <SidebarUserProfile />
            </Suspense>
          }
        />
        <div className="flex-1 pl-64 flex flex-col min-h-screen">
          <Header
            notifications={
              <Suspense fallback={<HeaderNotificationFallback />}>
                <HeaderNotificationSection />
              </Suspense>
            }
          />
          <main className="flex-1 p-6 sm:p-8 max-w-[1440px] w-full mx-auto">
            {children}
          </main>
        </div>
        <DynamicCommandPalette />
      </div>
    </LayoutHotkeysProvider>
  );
}
