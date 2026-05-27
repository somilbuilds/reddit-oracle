type ModeratorUser = { id: string; username: string };

type ModeratorReddit = {
  getCurrentUser(): Promise<ModeratorUser | undefined>;
  getModerators(options: {
    subredditName: string;
  }): { all(): Promise<ModeratorUser[]> };
};

export async function isCurrentUserModerator(
  reddit: ModeratorReddit,
  subredditName: string
): Promise<boolean> {
  const user = await reddit.getCurrentUser();
  if (!user) return false;

  const mods = await reddit.getModerators({ subredditName }).all();
  return mods.some(
    (mod) => mod.id === user.id || mod.username.toLowerCase() === user.username.toLowerCase()
  );
}
