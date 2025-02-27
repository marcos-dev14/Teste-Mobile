import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { AddressDto } from './dto/address.dto';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  async create(createAddressDto: CreateAddressDto): Promise<AddressDto> {
    const address = await this.prisma.address.create({
      data: {
        ...createAddressDto,
      },
    });

    return {
      id: address.id,
      fullName: address.fullName,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || undefined,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      userId: address.userId,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  async findAllByUser(userId: string): Promise<AddressDto[]> {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
    });

    return addresses.map((address) => ({
      id: address.id,
      fullName: address.fullName,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || undefined,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      userId: address.userId,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    }));
  }

  async findOne(id: string): Promise<AddressDto> {
    const address = await this.prisma.address.findUnique({
      where: { id },
    });

    if (!address) {
      throw new Error('Endereço não encontrado');
    }

    return {
      id: address.id,
      fullName: address.fullName,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || undefined,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      country: address.country,
      userId: address.userId,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }
}