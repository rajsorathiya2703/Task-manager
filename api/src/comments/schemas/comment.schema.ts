import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: Object, required: true })
  user: {
    name: string;
    avatarUrl?: string;
    /**
     * Mongoose User._id (ObjectId as string). Stored at comment-creation time
     * so ownership checks survive email changes.
     */
    userId?: string;
    email?: string;
    /**
     * Employee._id (ObjectId as string). Populated when the commenter is a
     * linked Employee. Used as an additional ownership signal in isCommentOwner().
     */
    employeeId?: string;
  };

  @Prop({ required: false, default: '' })
  content: string;

  @Prop([String])
  mentions?: string[];

  @Prop([{ name: String, url: String, type: { type: String, enum: ['link', 'file'] } }])
  attachments?: { name: string; url: string; type: 'link' | 'file' }[];
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
