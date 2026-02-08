import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { User, UserRole } from '@prisma/client';

interface CreateUserData {
  email: string;
  passwordHash: string;
  displayName: string;
  role?: UserRole;
  avatarUrl?: string;
  walletAddress?: string;
}

interface UpdateUserData {
  displayName?: string;
  avatarUrl?: string;
  walletAddress?: string;
  stripeCustomerId?: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
        role: data.role || 'viewer',
        avatarUrl: data.avatarUrl,
        walletAddress: data.walletAddress,
      },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { walletAddress },
    });
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async updateStripeCustomerId(id: string, stripeCustomerId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { stripeCustomerId },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  toPublicUser(user: User) {
    return {
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      role: user.role,
    };
  }
}
