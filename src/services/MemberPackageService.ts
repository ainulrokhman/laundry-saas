import { BaseService } from "./BaseService";
import { SessionUser } from "@/lib/session";
import { MemberPackageRepository } from "@/repositories/MemberPackageRepository";

export class MemberPackageService extends BaseService {
  constructor(
    private memberPackageRepository: MemberPackageRepository = new MemberPackageRepository()
  ) {
    super();
  }

  async listPackages(user: SessionUser | null, isActive?: boolean) {
    this.requireRole(user, ["OWNER", "STAFF"]);
    const outletId = this.getOutletId(user);
    return this.memberPackageRepository.findAll(outletId, isActive);
  }

  async getPackage(user: SessionUser | null, id: string) {
    this.requireRole(user, ["OWNER", "STAFF"]);
    const outletId = this.getOutletId(user);
    const pkg = await this.memberPackageRepository.findById(outletId, id);
    if (!pkg) throw new Error("Paket tidak ditemukan");
    return pkg;
  }

  async createPackage(user: SessionUser | null, data: {
    name: string;
    description?: string;
    price: number;
    quota: number;
    type: "KG" | "PCS";
    expiryDays?: number;
  }) {
    this.requireRole(user, ["OWNER"]);
    const outletId = this.getOutletId(user);

    return this.memberPackageRepository.create({
      ...data,
      outletId,
    });
  }

  async updatePackage(user: SessionUser | null, id: string, data: {
    name?: string;
    description?: string;
    price?: number;
    quota?: number;
    type?: "KG" | "PCS";
    expiryDays?: number;
    isActive?: boolean;
  }) {
    this.requireRole(user, ["OWNER"]);
    const outletId = this.getOutletId(user);

    return this.memberPackageRepository.update(outletId, id, data);
  }

  async deletePackage(user: SessionUser | null, id: string) {
    this.requireRole(user, ["OWNER"]);
    const outletId = this.getOutletId(user);
    return this.memberPackageRepository.delete(outletId, id);
  }
}
