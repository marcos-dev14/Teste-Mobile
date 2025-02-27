import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaService } from './prisma/prisma.service';
import { ProductsModule } from './products/products.module'; // Importação correta
import { AddressModule } from './address/address.module';
import { OrderModule } from './order/order.module';

@Module({
  imports: [AuthModule, UsersModule, ProductsModule, AddressModule, OrderModule], // Importa o ProductsModule
  controllers: [AppController],
  providers: [PrismaService], // Fornece o PrismaService globalmente
})
export class AppModule {}