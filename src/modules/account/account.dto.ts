import {
    IsUUID,
    IsEnum,
    IsNumber,
    Min,
    IsInt,
    IsPositive,
    IsBoolean,
    IsOptional,
} from 'class-validator';
import { OperationType } from '@prisma/client';

export class AccountCreateDto {
    @IsInt()
    @Min(0)
    balance: number

    @IsInt()
    @Min(1)
    coefficient: number
}

export class AccountOperationDto {
    @IsUUID()
    transactionId: string

    @IsUUID()
    accountId: string
  
    @IsEnum(OperationType)
    operationType: OperationType
    
    @IsNumber()
    @IsPositive()
    amount: number

    @IsOptional()
    @IsBoolean()
    refund?: boolean = false
}
  
export class AccountBalance {
    balance: number
}
