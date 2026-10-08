import { createClient as createServerClient } from "@teso/auth/server";
import { prisma } from "./prisma";
import { getRandomAvatar } from "./avatars";

export async function getCurrentUser() {
  try {
    const supabase = await createServerClient();
    const { data: { user: sbUser }, error } = await supabase.auth.getUser();

    if (error || !sbUser) {
      return null;
    }

    // Retrieve or auto-sync local database user
    let dbUser = await prisma.user.findUnique({
      where: { email: sbUser.email! }
    });

    const meta = sbUser.user_metadata || {};

    if (!dbUser) {
      const roleInMeta = meta.role || '';
      if (roleInMeta === 'host' || roleInMeta === 'HOST') {
        return null; // Teacher only registered in Teso Exams, do not auto-provision in Teso main app
      }

      const assignedAvatar = meta.avatar_url || getRandomAvatar();

      dbUser = await prisma.user.create({
        data: {
          id: sbUser.id,
          email: sbUser.email!,
          name: ((meta.first_name || '') + ' ' + (meta.last_name || '')).trim() || sbUser.email!.split('@')[0],
          role: 'STUDENT',
          image: assignedAvatar,
          age: meta.age ? parseInt(meta.age) : undefined,
          grade: meta.grade || undefined,
          examType: meta.exam_type || undefined,
          monthsToExam: meta.months_to_exam ? parseInt(meta.months_to_exam) : undefined,
          stream: meta.stream || undefined,
          subjects: meta.subjects || [],
        }
      });

      // Also ensure Supabase metadata has avatar_url
      if (!meta.avatar_url) {
        await supabase.auth.updateUser({
          data: { avatar_url: assignedAvatar }
        }).catch(() => {});
      }
    } else {
      // Sync names/meta and assign avatar if missing
      const name = ((meta.first_name || '') + ' ' + (meta.last_name || '')).trim() || sbUser.email!.split('@')[0];
      const needsAvatar = !dbUser.image;
      const avatarToSet = dbUser.image || meta.avatar_url || getRandomAvatar();

      if (dbUser.name !== name || dbUser.age !== meta.age || needsAvatar) {
        dbUser = await prisma.user.update({
          where: { id: dbUser.id },
          data: {
            name,
            age: meta.age ? parseInt(meta.age) : dbUser.age,
            grade: meta.grade || dbUser.grade,
            examType: meta.exam_type || dbUser.examType,
            monthsToExam: meta.months_to_exam ? parseInt(meta.months_to_exam) : dbUser.monthsToExam,
            stream: meta.stream || dbUser.stream,
            subjects: meta.subjects || dbUser.subjects,
            image: avatarToSet,
          }
        });

        if (!meta.avatar_url) {
          await supabase.auth.updateUser({
            data: { avatar_url: avatarToSet }
          }).catch(() => {});
        }
      }
    }

    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      dbId: dbUser.id,
      image: dbUser.image,
    };
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return null;
  }
}
