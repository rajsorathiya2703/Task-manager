import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  uploadFile(file: Express.Multer.File): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      if (!file) {
        return reject(new BadRequestException('File is not provided'));
      }
      
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'task-manager', resource_type: 'auto' },
        (error, result) => {
          if (error || !result) return reject(error || new BadRequestException('Upload failed'));
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  extractPublicId(url: string): string | null {
    if (!url) return null;
    const match = url.match(/\/upload\/(?:[^\/]+\/)?(?:v\d+\/)?([^\.\?#]+)/);
    return match ? match[1] : null;
  }

  getDownloadUrl(publicId: string, format = 'pdf', resourceType: 'image' | 'raw' = 'image'): string {
    return cloudinary.utils.private_download_url(publicId, format, {
      resource_type: resourceType,
      type: 'upload',
    });
  }

  async getFileStream(
    publicId: string,
    format = 'pdf',
  ): Promise<{ stream: NodeJS.ReadableStream; contentType: string; length?: number } | null> {
    try {
      // Try as image resource_type first (Cloudinary's default auto resource_type for pdf)
      let downloadUrl = this.getDownloadUrl(publicId, format, 'image');
      let response = await fetch(downloadUrl);

      if (!response.ok || response.status !== 200) {
        // Try as raw resource_type fallback
        downloadUrl = this.getDownloadUrl(publicId, format, 'raw');
        response = await fetch(downloadUrl);
      }

      if (!response.ok || !response.body) {
        return null;
      }

      const stream = Readable.fromWeb(response.body as any);
      const contentType = response.headers.get('content-type') || 'application/pdf';
      const length = response.headers.get('content-length')
        ? parseInt(response.headers.get('content-length')!, 10)
        : undefined;

      return { stream, contentType, length };
    } catch {
      return null;
    }
  }
}

