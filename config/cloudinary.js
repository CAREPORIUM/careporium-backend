// Cloudinary configuration for storing uploaded facility documents
// (business registration certificate, facility license, Tax ID).
// Credentials come from environment variables — never hardcode them here.
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;
