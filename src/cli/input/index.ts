export { readCliInput } from './reader';
export { 
  cleanupAttachmentsRoot, 
  stageImageAttachments, 
  getAttachmentsCleanupConfigFromEnv 
} from './images/attachments';
export { 
  readFileAsDataUrl, 
  buildMultimodalContent 
} from './images/imageInput';
export { 
  maybeAttachReadImageToContext 
} from './images/readImageAttachment';
export type { 
  ImageDetail, 
  ImageDataUrl 
} from './images/imageInput';
