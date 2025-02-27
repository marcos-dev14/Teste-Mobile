import {
  Controller,
  Post,
  Body,
  Get,
  Param,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import type { OrderDto } from './dto/order.dto';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async create(@Body() createOrderDto: CreateOrderDto): Promise<OrderDto> {
    return this.orderService.create(createOrderDto);
  }

  @Get('user/:userId') // Rota para listar pedidos de um usuário
  async findAllByUser(@Param('userId') userId: string): Promise<OrderDto[]> {
    return this.orderService.findAllByUser(userId);
  }
}