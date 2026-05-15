import bcrypt from 'bcryptjs';
import { Role, User } from '@/generated/prisma';
import { formatPhoneNumber, isValidPhoneNumber, normalizePhoneNumber } from '@/lib/utils';
import { UserRepository } from '@/repositories/UserRepository';
import { PackageFeatureService } from '@/services/PackageFeatureService';

export type StaffUser = User;

export type CreateStaffInput = {
  outletId: string;
  phone: string;
  name: string;
  pin: string; // 4-6 digit (plain), akan di-hash
  isActive?: boolean;
};

export type UpdateStaffInput = {
  staffId: string;
  actorUserId: string;
  outletId?: string; // Current outletId (optional in global mode)
  ownerId?: string;  // Required if outletId is not provided
  newOutletId?: string; // The target outletId to move to
  phone?: string;
  name?: string;
  isActive?: boolean;
};

export class StaffServiceError extends Error {
  constructor(
    public code:
      | 'VALIDATION'
      | 'DUPLICATE_PHONE'
      | 'NOT_FOUND'
      | 'SELF_DEACTIVATE_NOT_ALLOWED'
      | 'LIMIT_REACHED',
    message: string
  ) {
    super(message);
    this.name = 'StaffServiceError';
  }
}

export class StaffService {
  private packageFeatureService: PackageFeatureService;

  constructor(private userRepository: UserRepository = new UserRepository()) {
    this.packageFeatureService = new PackageFeatureService();
  }

  async listStaffByOutletId(outletId: string) {
    const result = await this.userRepository.findAll(
      { role: Role.STAFF, outletId },
      { page: 1, limit: 200 }
    );
    return result.data;
  }

  async listStaffByOwnerId(ownerId: string) {
    const result = await this.userRepository.findAll(
      { role: Role.STAFF, ownerId },
      { page: 1, limit: 200 }
    );
    return result.data;
  }

  async getStaffById(staffId: string, options: { outletId?: string; ownerId?: string }) {
    const user = await this.userRepository.findById(staffId);
    
    if (!user || user.role !== Role.STAFF) {
      throw new StaffServiceError('NOT_FOUND', 'Staff tidak ditemukan');
    }

    // Verify ownership
    if (options.outletId && user.outletId !== options.outletId) {
      throw new StaffServiceError('NOT_FOUND', 'Staff tidak ditemukan di outlet ini');
    }

    if (options.ownerId) {
      // Check if the user's outlet belongs to this owner
      const outlet = await this.userRepository.findOutletById(user.outletId!);
      if (!outlet || outlet.ownerId !== options.ownerId) {
        throw new StaffServiceError('NOT_FOUND', 'Staff tidak ditemukan');
      }
    }

    return user;
  }

  async createStaff(input: CreateStaffInput) {
    // Check package limits
    const canAdd = await this.packageFeatureService.canAddStaff(input.outletId);
    if (!canAdd) {
      throw new StaffServiceError(
        'LIMIT_REACHED',
        'Batas maksimum staff untuk paket Anda telah tercapai. Upgrade paket untuk menambah outlet.'
      );
    }

    const name = input.name.trim();
    if (name.length < 2) {
      throw new StaffServiceError('VALIDATION', 'Nama minimal 2 karakter');
    }

    if (!/^\d{4,6}$/.test(input.pin)) {
      throw new StaffServiceError('VALIDATION', 'PIN harus 4-6 digit');
    }

    const normalizedPhone = normalizePhoneNumber(input.phone);
    const formattedPhone = formatPhoneNumber(input.phone);
    if (!isValidPhoneNumber(formattedPhone)) {
      throw new StaffServiceError('VALIDATION', 'Format nomor WhatsApp tidak valid');
    }

    const existing = await this.userRepository.findByPhone(normalizedPhone);
    if (existing) {
      throw new StaffServiceError('DUPLICATE_PHONE', 'Nomor WhatsApp sudah terdaftar');
    }

    const pinHash = await bcrypt.hash(input.pin, 10);

    const created = await this.userRepository.create({
      phone: normalizedPhone,
      name,
      role: Role.STAFF,
      outletId: input.outletId,
      pinHash,
      isActive: input.isActive ?? true,
      isPinSet: true,
    });

    const createdWithOutlet = await this.userRepository.findById(created.id);
    // create() pasti return id valid; jika findById null, fallback created.
    return (createdWithOutlet ?? created) as any;
  }

  async updateStaff(input: UpdateStaffInput) {
    const existing = await this.getStaffById(input.staffId, { 
      outletId: input.outletId, 
      ownerId: input.ownerId 
    });

    if (input.isActive === false && input.staffId === input.actorUserId) {
      throw new StaffServiceError(
        'SELF_DEACTIVATE_NOT_ALLOWED',
        'Anda tidak bisa menonaktifkan akun Anda sendiri'
      );
    }

    let normalizedPhone: string | undefined;
    if (input.phone !== undefined) {
      normalizedPhone = normalizePhoneNumber(input.phone);
      const formattedPhone = formatPhoneNumber(input.phone);
      if (!isValidPhoneNumber(formattedPhone)) {
        throw new StaffServiceError('VALIDATION', 'Format nomor WhatsApp tidak valid');
      }

      if (normalizedPhone !== existing.phone) {
        const dup = await this.userRepository.findByPhone(normalizedPhone);
        if (dup) {
          throw new StaffServiceError('DUPLICATE_PHONE', 'Nomor WhatsApp sudah terdaftar');
        }
      }
    }

    const nextName = input.name !== undefined ? input.name.trim() : undefined;
    if (nextName !== undefined && nextName.length < 2) {
      throw new StaffServiceError('VALIDATION', 'Nama minimal 2 karakter');
    }

    // Verify new outlet ownership if changing outlet
    if (input.newOutletId && input.newOutletId !== existing.outletId) {
      const ownerIdToVerify = input.ownerId;
      if (ownerIdToVerify) {
        const outlet = await this.userRepository.findOutletById(input.newOutletId);
        if (!outlet || outlet.ownerId !== ownerIdToVerify) {
          throw new StaffServiceError('VALIDATION', 'Outlet baru tidak valid atau bukan milik Anda');
        }
      }
    }

    const updated = await this.userRepository.update(input.staffId, {
      phone: normalizedPhone,
      name: nextName,
      outletId: input.newOutletId, // Allow changing outlet
      isActive: input.isActive,
    });

    const updatedWithOutlet = await this.userRepository.findById(updated.id);
    return (updatedWithOutlet ?? updated) as any;
  }
}
