import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class JoinCompanyDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  secretCode: string;
}
