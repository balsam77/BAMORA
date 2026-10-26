import { Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Length, Matches, MaxLength, Min } from "class-validator";

export class MerchantProductDto {
  @IsString()
  @Length(2, 160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @Length(1, 160)
  category!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  subCategory?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock!: number;

  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/)
  price!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  images!: string[];

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @Length(1, 50, { each: true })
  sizes!: string[];

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @Length(1, 50, { each: true })
  colors!: string[];
}
