import { PartialType } from '@nestjs/mapped-types';
import { CreateAwsS3Dto } from './create-aws-s3.dto';

export class UpdateAwsS3Dto extends PartialType(CreateAwsS3Dto) {}
