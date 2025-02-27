export interface AddressParams {
  id?: string;
  userId: string | null;
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface AddressByUserIdResponse {
  address: AddressParams[]
}