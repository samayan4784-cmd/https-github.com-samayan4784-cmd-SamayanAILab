
export enum ToolType {
  DASHBOARD = 'DASHBOARD',
  AD_CREATOR = 'AD_CREATOR',
  LOGO_DESIGNER = 'LOGO_DESIGNER',
  WEBSITE_DESIGNER = 'WEBSITE_DESIGNER',
  IMAGE_LAB = 'IMAGE_LAB',
  VOICE_STUDIO = 'VOICE_STUDIO',
  ANIMATION_3D = 'ANIMATION_3D',
  THUMBNAIL_DESIGNER = 'THUMBNAIL_DESIGNER',
  POSTER_DESIGNER = 'POSTER_DESIGNER',
  MY_PROJECTS = 'MY_PROJECTS'
}

export interface Project {
  id: string;
  name: string;
  type: ToolType;
  content: string; // Text content or code
  mediaUrl?: string; // Image, Video, or Audio URL
  html?: string; // HTML content for websites
  createdAt: number;
}

export interface GenerationResult {
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  code?: string;
  html?: string;
}

export interface WebPreviewProps {
  code: string;
}
