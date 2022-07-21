import { Event } from './events.enum'


export class AccountCreditEvent {
    type = Event.AccountCredit;

    constructor(
        public transactionId: string,
        public accountId: string,
        public amount: number,
    ) {}
}

export class AccountCreditSuccessEvent {
    type = Event.AccountCreditSuccess;

    constructor(
        public transactionId: string,
        public accountId: string,
    ) {}
}

export class AccountCreditErrorEvent {
    type = Event.AccountCreditError;

    constructor(
        public transactionId: string,
        public accountId: string,
        public amount: number,
        public error: string,
    ) {}
}

export class AccountDebitEvent {
    type = Event.AccountDedit;

    constructor(
        public transactionId: string,
        public accountId: string,
        public amount: number,
        public refund: boolean = false,
    ) {}
}

export class AccountDebitSuccessEvent {
    type = Event.AccountDeditSuccess;

    constructor(
        public transactionId: string,
        public accountId: string,
        public refund: boolean = false,
    ) {}
}

export class AccountDebitErrorEvent {
    type = Event.AccountDeditError;

    constructor(
        public transactionId: string,
        public accountId: string,
        public amount: number,
        public refund: boolean = false,
        public error: string,
    ) {}
}
