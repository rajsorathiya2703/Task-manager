import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import * as dns from 'dns';

// Fix Node.js DNS resolution issues on Windows for MongoDB Atlas & cloud container IPv6 issues (Render ENETUNREACH)
try {
  dns.setDefaultResultOrder('ipv4first');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // fallback to system default if setting custom servers fails
}


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.use(cookieParser());
  
  const configuredOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      if (
        configuredOrigins.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  mongoose.connection.on('connected', () => {
    Logger.log('MongoDB connected', 'Mongoose');
  });

  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';

  try {
    await app.listen(port, host);
    Logger.log(`Application is running on http://${host}:${port}`, 'Bootstrap');
  } catch (err: any) {
    if (err?.code === 'EADDRINUSE') {
      Logger.error(`Port ${port} is already in use. Please stop the process running on port ${port} or change PORT in .env`, 'Bootstrap');
    } else {
      Logger.error(`Failed to start server: ${err?.message || err}`, 'Bootstrap');
    }
    process.exit(1);
  }
}
bootstrap();
