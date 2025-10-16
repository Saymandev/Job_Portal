import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { IpBlockGuard } from './common/guards/ip-block.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.use(cookieParser());

  // CORS - Configure for production and development
  const frontendUrl = configService.get('FRONTEND_URL') || 'http://localhost:3000';
  const allowedOrigins = [
    frontendUrl,
    'http://localhost:3000',
    'https://localhost:3000',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // In production, only allow the configured frontend URL
      if (configService.get('NODE_ENV') === 'production') {
        return callback(new Error('Not allowed by CORS'), false);
      }
      
      // In development, allow localhost
      if (origin.includes('localhost')) {
        return callback(null, true);
      }
      
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Raw body parsing for Stripe webhooks
  app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }));

  // Serve static files
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global IP blocking guard
  const ipBlockGuard = app.get(IpBlockGuard);
  app.useGlobalGuards(ipBlockGuard);

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Job Portal API')
    .setDescription('Complete API documentation for Job Portal SaaS Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Users', 'User management')
    .addTag('Jobs', 'Job listings management')
    .addTag('Applications', 'Job applications')
    .addTag('Companies', 'Company profiles')
    .addTag('Subscriptions', 'Stripe subscriptions')
    .addTag('Chat', 'Real-time messaging')
    .addTag('Notifications', 'User notifications')
    .addTag('Messaging Permissions', 'Messaging permission management')
    .addTag('Admin', 'Admin operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = configService.get('PORT') || 5000;
  await app.listen(port);

  console.log(`
    🚀 Server is running!
    🔉 Listening on port ${port}
    📚 API Documentation: http://localhost:${port}/api-docs
    🌍 Environment: ${configService.get('NODE_ENV')}
  `);
}

bootstrap();

