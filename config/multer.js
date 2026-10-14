import multer from "multer";

// Multer handles multipart/form-data file uploads. Uploaded files are written
// to the local "uploads" folder first, then uploaded to Cloudinary by the
// facility registration service.
const storage = multer.diskStorage({
  // All uploads land in the project's "uploads" directory.
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  // Build a unique filename from the form field name + timestamp + original
  // name so two uploads can never collide (e.g. "TaxID-1699...-receipt.pdf").
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + "-" + file.originalname);
  },
});

// Export the configured multer instance; routes call upload.fields([...]) to
// accept specific named files.
const upload = multer({ storage: storage });

export default upload;
