import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';
import { ProjectsModule } from './projects/projects.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { EmployeesModule } from './employees/employees.module';
import { TeamsModule } from './teams/teams.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { DayOffModule } from './day-off/day-off.module';
import { AccessModule } from './access/access.module';
import { RolesModule } from './roles/roles.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { AccessGuard } from './access/access.guard';
import { FieldAccessInterceptor } from './access/field-access.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    TasksModule,
    ProjectsModule,
    CloudinaryModule,
    EmployeesModule,
    TeamsModule,
    DashboardModule,
    ChatbotModule,
    DayOffModule,
    AccessModule,
    RolesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AccessGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: FieldAccessInterceptor,
    },
  ],
})
export class AppModule { }
