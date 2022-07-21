import {
    IsUUID,
    IsNumber,
    IsPositive,
} from 'class-validator';

export class TransferDto {
    @IsNumber()
    @IsPositive()
    amount: number

    @IsUUID()
    accountIdFrom: string
  
    @IsUUID()
    accountIdTo: string  
}
