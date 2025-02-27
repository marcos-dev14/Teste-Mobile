import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true,  // Remove propriedades desconhecidas automaticamente
    forbidNonWhitelisted: true, // Retorna erro se receber propriedades desconhecidas
    transform: true, // Transforma o payload nos DTOs definidos
  }));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
