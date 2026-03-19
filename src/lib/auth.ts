import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export async function authenticateUser(username: string, password: string) {
  const user = await prisma.pc_users.findUnique({ where: { username } });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    bAccountId: user.bAccountId,
  };
}
