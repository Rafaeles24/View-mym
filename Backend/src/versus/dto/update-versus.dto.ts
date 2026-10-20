import { PartialType } from "@nestjs/mapped-types";
import { CreateVersusDto } from "./create-versus.dto";

export class UpdateVersusDto extends PartialType(CreateVersusDto) {}