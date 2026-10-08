export interface AvatarOption {
  id: string;
  path: string;
  label: string;
}

export const AVATAR_LIST: AvatarOption[] = [
  { id: "avatar-1", path: "/avatars/051a18c3f9.svg", label: "Student Avatar 1" },
  { id: "avatar-2", path: "/avatars/110d8a3ca7.svg", label: "Student Avatar 2" },
  { id: "avatar-3", path: "/avatars/1c8af305ee.svg", label: "Student Avatar 3" },
  { id: "avatar-4", path: "/avatars/2e3e2dbfbb.svg", label: "Student Avatar 4" },
  { id: "avatar-5", path: "/avatars/65c02ef480.svg", label: "Student Avatar 5" },
  { id: "avatar-6", path: "/avatars/6e8385f4a2.svg", label: "Student Avatar 6" },
  { id: "avatar-7", path: "/avatars/7d1e909a36.svg", label: "Student Avatar 7" },
  { id: "avatar-8", path: "/avatars/977dabe8c2.svg", label: "Student Avatar 8" },
  { id: "avatar-9", path: "/avatars/b38b0265ed.svg", label: "Student Avatar 9" },
  { id: "avatar-10", path: "/avatars/b5d87eb904.svg", label: "Student Avatar 10" },
  { id: "avatar-11", path: "/avatars/d5bf27df78.svg", label: "Student Avatar 11" },
  { id: "avatar-12", path: "/avatars/fa9474f211.svg", label: "Student Avatar 12" },
];

export const AVATAR_PATHS = AVATAR_LIST.map((a) => a.path);

export function getRandomAvatar(): string {
  const randomIndex = Math.floor(Math.random() * AVATAR_PATHS.length);
  return AVATAR_PATHS[randomIndex];
}
