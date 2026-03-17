import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create B-Accounts
  const b1 = await prisma.pc_b_accounts.upsert({
    where: { name: "B1" },
    update: {},
    create: { name: "B1" },
  });

  const b2 = await prisma.pc_b_accounts.upsert({
    where: { name: "B2" },
    update: {},
    create: { name: "B2" },
  });

  console.log("Created B-Accounts:", b1.name, b2.name);

  // Create Master user
  const masterPassword = await bcrypt.hash("master123", 10);
  await prisma.pc_users.upsert({
    where: { email: "master@paysync.com" },
    update: {},
    create: {
      email: "master@paysync.com",
      password: masterPassword,
      name: "Master Admin",
      role: "MASTER",
    },
  });

  // Create B1 user
  const b1Password = await bcrypt.hash("b1pass123", 10);
  await prisma.pc_users.upsert({
    where: { email: "b1@paysync.com" },
    update: {},
    create: {
      email: "b1@paysync.com",
      password: b1Password,
      name: "B1 Manager",
      role: "B_ACCOUNT",
      bAccountId: b1.id,
    },
  });

  // Create B2 user
  const b2Password = await bcrypt.hash("b2pass123", 10);
  await prisma.pc_users.upsert({
    where: { email: "b2@paysync.com" },
    update: {},
    create: {
      email: "b2@paysync.com",
      password: b2Password,
      name: "B2 Manager",
      role: "B_ACCOUNT",
      bAccountId: b2.id,
    },
  });

  console.log("Created users");

  // Create P-Groups for B1
  const b1Groups = ["P1", "P2", "P3", "P4", "P5"];
  const b1Members: Record<string, string[]> = {
    P1: ["Sai", "Suresh", "Naresh", "Ravi"],
    P2: ["Kumar", "Praveen", "Ganesh"],
    P3: ["Ramesh", "Venkat", "Anil", "Srinivas"],
    P4: ["Kiran", "Manoj"],
    P5: ["Rajesh", "Prasad", "Sekhar"],
  };

  for (const groupName of b1Groups) {
    const group = await prisma.pc_p_groups.upsert({
      where: { bAccountId_name: { bAccountId: b1.id, name: groupName } },
      update: {},
      create: { name: groupName, bAccountId: b1.id },
    });

    for (const memberName of b1Members[groupName]) {
      await prisma.pc_p_group_members.upsert({
        where: { pGroupId_name: { pGroupId: group.id, name: memberName } },
        update: {},
        create: { name: memberName, pGroupId: group.id },
      });
    }
  }

  // Create P-Groups for B2
  const b2Groups = ["P1", "P2", "P3"];
  const b2Members: Record<string, string[]> = {
    P1: ["Mahesh", "Chandra", "Deepak"],
    P2: ["Harsha", "Vinod"],
    P3: ["Satish", "Ramana", "Gopal"],
  };

  for (const groupName of b2Groups) {
    const group = await prisma.pc_p_groups.upsert({
      where: { bAccountId_name: { bAccountId: b2.id, name: groupName } },
      update: {},
      create: { name: groupName, bAccountId: b2.id },
    });

    for (const memberName of b2Members[groupName]) {
      await prisma.pc_p_group_members.upsert({
        where: { pGroupId_name: { pGroupId: group.id, name: memberName } },
        update: {},
        create: { name: memberName, pGroupId: group.id },
      });
    }
  }

  console.log("Created P-Groups with members");

  // Create N-Names for B1
  const b1NNames = ["N1", "N2", "N3", "N4"];
  for (const nName of b1NNames) {
    await prisma.pc_n_names.upsert({
      where: { bAccountId_name: { bAccountId: b1.id, name: nName } },
      update: {},
      create: { name: nName, bAccountId: b1.id },
    });
  }

  // Create N-Names for B2
  const b2NNames = ["N1", "N2", "N3"];
  for (const nName of b2NNames) {
    await prisma.pc_n_names.upsert({
      where: { bAccountId_name: { bAccountId: b2.id, name: nName } },
      update: {},
      create: { name: nName, bAccountId: b2.id },
    });
  }

  console.log("Created N-Names");
  console.log("\n--- Seed Complete ---");
  console.log("Login credentials:");
  console.log("  Master: master@paysync.com / master123");
  console.log("  B1:     b1@paysync.com / b1pass123");
  console.log("  B2:     b2@paysync.com / b2pass123");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
