import { Injectable } from "@nestjs/common";

@Injectable()
export class VisorTimeService {
  getCurrentTime() {
    return {
      utc: new Date().toISOString(),
    };
  }
}