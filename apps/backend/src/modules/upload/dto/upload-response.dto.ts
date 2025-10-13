import { ApiProperty } from '@nestjs/swagger';

export class FileScanResultDto {
  @ApiProperty({ description: 'Whether the file is safe' })
  isSafe: boolean;

  @ApiProperty({ description: 'File type category' })
  fileType: string;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize: number;

  @ApiProperty({ description: 'SHA-256 checksum of the file' })
  checksum: string;

  @ApiProperty({ description: 'List of detected threats', type: [String] })
  threats: string[];

  @ApiProperty({ description: 'Scan details' })
  scanDetails: {
    scannedAt: Date;
    scanDuration: number;
    engineVersion: string;
  };
}

export class UploadResponseDto {
  @ApiProperty({ description: 'Upload success status' })
  success: boolean;

  @ApiProperty({ description: 'Response message' })
  message: string;

  @ApiProperty({ description: 'Uploaded file data' })
  data: {
    originalName: string;
    sanitizedName: string;
    size: number;
    fileType: string;
    checksum: string;
    url: string;
    scanResult: {
      isSafe: boolean;
      scanDuration: number;
      scannedAt: Date;
    };
  };
}

export class UploadErrorDto {
  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({ description: 'List of detected threats', type: [String], required: false })
  threats?: string[];

  @ApiProperty({ description: 'Scan details', required: false })
  scanDetails?: {
    scannedAt: Date;
    scanDuration: number;
    engineVersion: string;
  };
}
