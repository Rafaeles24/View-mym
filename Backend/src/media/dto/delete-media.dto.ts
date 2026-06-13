import { IsNumber } from "class-validator";

export class DeleteMediaDto {
  @IsNumber()
  id: number;
}