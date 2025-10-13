import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { extname } from 'path';

@Module({
  imports: [
    ConfigModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const cloudName = configService.get('CLOUDINARY_CLOUD_NAME');
        const apiKey = configService.get('CLOUDINARY_API_KEY');
        const apiSecret = configService.get('CLOUDINARY_API_SECRET');

        // Use Cloudinary if credentials are available, otherwise fallback to disk storage
        console.log('Cloudinary config:', { cloudName: !!cloudName, apiKey: !!apiKey, apiSecret: !!apiSecret });
        if (cloudName && apiKey && apiSecret) {
          cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
          });

          return {
            storage: new CloudinaryStorage({
              cloudinary: cloudinary,
              params: (req, file) => {
                return {
                  folder: 'job-portal',
                  resource_type: 'auto',
                  transformation: [
                    { quality: 'auto' },
                    { fetch_format: 'auto' }
                  ]
                };
              },
            }),
            limits: {
              fileSize: 10 * 1024 * 1024, // 10MB
            },
            fileFilter: (req, file, callback) => {
              const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
              const mimetype = allowedTypes.test(file.mimetype);
              const extName = allowedTypes.test(extname(file.originalname).toLowerCase());

              if (mimetype && extName) {
                return callback(null, true);
              }
              callback(new Error('Invalid file type. Only images, PDF, and Word documents are allowed.'), false);
            },
          };
        } else {
          // Fallback to disk storage
          const { diskStorage } = require('multer');
          return {
            storage: diskStorage({
              destination: './uploads',
              filename: (req, file, callback) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                callback(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
              },
            }),
            limits: {
              fileSize: 10 * 1024 * 1024, // 10MB
            },
            fileFilter: (req, file, callback) => {
              const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
              const mimetype = allowedTypes.test(file.mimetype);
              const extName = allowedTypes.test(extname(file.originalname).toLowerCase());

              if (mimetype && extName) {
                return callback(null, true);
              }
              callback(new Error('Invalid file type. Only images, PDF, and Word documents are allowed.'), false);
            },
          };
        }
      },
      inject: [ConfigService],
    }),
  ],
  exports: [MulterModule],
})
export class UploadModule {}

