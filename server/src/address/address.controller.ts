import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { AddressDto } from './dto/address.dto';

@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  async create(@Body() createAddressDto: CreateAddressDto): Promise<AddressDto> {
    return this.addressService.create(createAddressDto)
  }

  @Get('/user/:userId') 
  async findAllByUser(@Param('userId') userId: string): Promise<AddressDto[]> {
    return this.addressService.findAllByUser(userId);
  }

  @Get(':id') 
  async findOne(@Param('id') id: string): Promise<AddressDto> {
    return this.addressService.findOne(id);
  }
}