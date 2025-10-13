import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export const configureCloudinary = (configService: ConfigService) => {
  const cloudName = configService.get('CLOUDINARY_CLOUD_NAME');
  const apiKey = configService.get('CLOUDINARY_API_KEY');
  const apiSecret = configService.get('CLOUDINARY_API_SECRET');

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    return true;
  }
  return false;
};

export { cloudinary };

