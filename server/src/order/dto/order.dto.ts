import type { Prisma } from "@prisma/client";

export class OrderDto {
  id: string;
  userId: string;
  addressId: string;
  items: Prisma.JsonArray;
  totalItems: number;
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}