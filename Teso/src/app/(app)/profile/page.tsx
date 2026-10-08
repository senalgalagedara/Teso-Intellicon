import { UserAccount } from "@/components/profile/UserAccount";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRandomAvatar } from "@/lib/avatars";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) {
    redirect("/auth/sign-in");
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id }
  });

  if (!dbUser) {
    redirect("/auth/sign-in");
  }

  let userForProfile = dbUser;
  if (!dbUser.image) {
    const randomAvatar = getRandomAvatar();
    userForProfile = await prisma.user.update({
      where: { id: dbUser.id },
      data: { image: randomAvatar }
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <UserAccount initialUser={userForProfile} />
    </div>
  );
}
