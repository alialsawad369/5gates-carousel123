// lib/cloudinary.ts
// Free tier: 25 GB storage, 25 GB bandwidth/month
// That's ~8,000 carousel slides free per month (avg 3MB/slide)
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

export async function uploadBase64(
  base64: string,   // "data:image/jpeg;base64,/9j/..."
  folder: string,
  publicId: string
): Promise<string> {
  const result = await cloudinary.uploader.upload(base64, {
    folder:    `5gates/${folder}`,
    public_id: publicId,
    overwrite: true,
    resource_type: 'image',
    format: 'jpg',
    quality: 90,
    transformation: [{ width: 1080, height: 1350, crop: 'fill' }],
  })
  return result.secure_url
}

export async function deleteFolder(folder: string) {
  try {
    await cloudinary.api.delete_resources_by_prefix(`5gates/${folder}`)
  } catch (_) {}
}
