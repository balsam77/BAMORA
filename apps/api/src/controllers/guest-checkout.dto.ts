import { Type, Transform } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsInt, IsString, Length, Matches, Max, Min, ValidateNested } from "class-validator";

export class ShippingDetailsDto {
  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value)
  @IsString()
  @Length(2, 80)
  name!: string;

  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value)
  @IsString()
  @Length(7, 32)
  @Matches(/^(?=(?:\D*\d){7,15}\D*$)\+?[\d\s()-]+$/)
  phone!: string;

  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value)
  @IsEmail()
  email!: string;

  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value)
  @IsString()
  @Length(2, 100)
  city!: string;

  @Transform(({ value }: { value: unknown }) => typeof value === "string" ? value.trim() : value)
  @IsString()
  @Length(3, 200)
  street!: string;

  @IsString()
  @Length(1, 80)
  shippingZoneId!: string;
}

export class GuestCartItemDto {
  @IsString()
  @Length(1, 80)
  productId!: string;

  @IsString()
  @Length(1, 80)
  size!: string;

  @IsString()
  @Length(1, 80)
  color!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  quantity!: number;
}

export class GuestCheckoutDto extends ShippingDetailsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => GuestCartItemDto)
  items!: GuestCartItemDto[];
}
