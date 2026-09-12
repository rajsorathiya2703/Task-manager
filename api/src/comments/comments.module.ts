import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';

/**
 * CommentsModule
 *
 * Provides the shared CommentsService (ownership checks, etc.)
 * to any module that imports it (e.g. TasksModule, TeamsModule).
 */
@Module({
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
