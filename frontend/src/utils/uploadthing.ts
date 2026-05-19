import {
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";
import type { OurFileRouter } from "../../../backend/src/uploadthing/router"; 

// 1. Generate the components
const UploadButton = generateUploadButton<OurFileRouter>({
  url: "http://localhost:5000/api/uploadthing",
});

const UploadDropzone = generateUploadDropzone<OurFileRouter>({
  url: "http://localhost:5000/api/uploadthing",
});

// 2. Explicitly export them
export { UploadButton, UploadDropzone };