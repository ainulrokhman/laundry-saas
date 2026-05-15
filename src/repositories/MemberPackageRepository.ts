import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma";

export class MemberPackageRepository {
  async findAll(outletId: string, isActive?: boolean) {
    return prisma.memberPackage.findMany({
      where: {
        outletId,
        ...(isActive !== undefined && { isActive }),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(outletId: string, id: string) {
    return prisma.memberPackage.findFirst({
      where: { id, outletId },
    });
  }

  async create(data: Prisma.MemberPackageUncheckedCreateInput) {
    return prisma.memberPackage.create({
      data,
    });
  }

  async update(outletId: string, id: string, data: Prisma.MemberPackageUncheckedUpdateInput) {
    return prisma.memberPackage.update({
      where: { id, outletId },
      data,
    });
  }

  async delete(outletId: string, id: string) {
    return prisma.memberPackage.delete({
      where: { id, outletId },
    });
  }
}
