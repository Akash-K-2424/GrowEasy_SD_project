import { Router } from "express";
import { importCsv, importCsvStream } from "../controllers/import.controller";
import { csvUpload } from "../middleware/upload.middleware";
import { asyncHandler } from "../utils/asyncHandler";

export const importRouter = Router();

importRouter.post("/", csvUpload.single("file"), asyncHandler(importCsv));
importRouter.post("/stream", csvUpload.single("file"), asyncHandler(importCsvStream));
