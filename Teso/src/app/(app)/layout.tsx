import { Sidebar } from "@/components/shared/Sidebar";
import { AppNavbar } from "@/components/shared/AppNavbar";
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LanguageProvider } from "@/components/providers/LanguageProvider";
// import AvatarChatbot from "@/components/landing/AvatarChatbot";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  return (
    <LanguageProvider>
      <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#080E1A] text-slate-900 dark:text-slate-100 transition-colors duration-200">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <AppNavbar userImage={currentUser?.image} userName={currentUser?.name} />
          <main className="flex-1 overflow-auto relative bg-[#F8FAFC] dark:bg-[#080E1A] text-slate-900 dark:text-slate-100 transition-colors duration-200">
            {children}
          </main>
          {/* <AvatarChatbot /> */}
        </div>
      </div>
    </LanguageProvider>
  );
}
