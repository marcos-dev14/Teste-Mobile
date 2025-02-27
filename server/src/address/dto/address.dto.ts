export class AddressDto {
  id: string;
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}