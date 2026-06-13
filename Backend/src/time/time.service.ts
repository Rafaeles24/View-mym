import { Injectable } from '@nestjs/common';

@Injectable()
export class TimeService {
    constructor() {}

    getCurrentTime() {
        const now = new Date();

        return { 
            utc: new Date().toISOString()
        }
    }
}
