import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { applyTenantPlugin } from '../../common/tenant.plugin';

@Schema({ timestamps: true })
export class Employee extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  companyId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId;

  @Prop({ type: Object, required: true })
  fullName: {
    firstName: string;
    middleName?: string;
    lastName: string;
  };

  @Prop()
  personalNumber?: string;

  @Prop()
  houseContactNumber?: string;

  @Prop({ required: true })
  role: string;

  @Prop({ required: true })
  joiningDate: Date;

  @Prop()
  email?: string;

  @Prop()
  department?: string;

  @Prop({ default: 'Active', enum: ['Active', 'On Leave', 'Terminated'] })
  status: string;

  @Prop()
  address?: string;

  // Payroll Preparatory Fields
  @Prop()
  baseSalary?: number;

  @Prop({ default: 'USD' })
  currency?: string;

  @Prop({ enum: ['Weekly', 'Bi-weekly', 'Monthly'] })
  payFrequency?: string;

  @Prop()
  bankAccountNumber?: string;

  @Prop()
  bankRoutingNumber?: string;

  @Prop()
  taxId?: string;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);

// NOTE: The legacy collection has an old global unique index on email ('email_1').
// Migration task (MC-49) must drop it: db.employees.dropIndex('email_1');
EmployeeSchema.index(
  { companyId: 1, email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } },
);

EmployeeSchema.index({ companyId: 1, userId: 1 });

applyTenantPlugin(EmployeeSchema);
