
import { GoogleGenAI, Modality } from "@google/genai";
import { ToolType } from "../types";

// Helper to get fresh client with the environment API key
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateCreativeContent = async (
  tool: ToolType,
  prompt: string,
  base64Image?: string,
  mimeType?: string
): Promise<{ text?: string; imageUrl?: string; code?: string; html?: string }> => {
  const ai = getClient();
  
  // 1. Image Generation Tools 
  // We use gemini-2.5-flash-image to ensure stability and avoid mandatory API key selection popups
  if ([ToolType.LOGO_DESIGNER, ToolType.THUMBNAIL_DESIGNER, ToolType.POSTER_DESIGNER, ToolType.AD_CREATOR, ToolType.ANIMATION_3D].includes(tool)) {
    
    let systemInstruction = "";
    let aspectRatio = "1:1";

    if (tool === ToolType.LOGO_DESIGNER) systemInstruction = "Create a professional, vector-style, clean logo.";
    if (tool === ToolType.AD_CREATOR) systemInstruction = "Create a high-converting, professional advertising image.";
    if (tool === ToolType.THUMBNAIL_DESIGNER) {
        systemInstruction = "Create a vibrant, high-contrast YouTube thumbnail.";
        aspectRatio = "16:9";
    }
    if (tool === ToolType.POSTER_DESIGNER) {
        systemInstruction = "Create a stunning event or movie poster.";
        aspectRatio = "3:4";
    }
    if (tool === ToolType.ANIMATION_3D) {
        // Explicitly asking for a render, not a video
        systemInstruction = "Create a high-quality 3D rendered image (not video). Pixar style, Unreal Engine 5, cinematic lighting, 8k resolution character or scene.";
        aspectRatio = "16:9";
    }

    let contents: any;
    const finalPrompt = `${systemInstruction} ${prompt}`;

    if (base64Image && mimeType) {
        contents = {
            parts: [
                { inlineData: { data: base64Image, mimeType: mimeType } },
                { text: finalPrompt }
            ]
        };
    } else {
        contents = {
             parts: [{ text: finalPrompt }]
        };
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', // Using Flash Image for reliability
            contents: contents,
            config: {
                // Note: aspect ratio support depends on the model version, standardizing to prompt for best results in flash
            }
        });

        let imageUrl = "";
        let textResponse = "";

        if (response.candidates && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                } else if (part.text) {
                    textResponse = part.text;
                }
            }
        }
        return { imageUrl, text: textResponse };

    } catch (error) {
        console.error("Image gen error", error);
        throw new Error("Creation failed. Please try again.");
    }
  }

  // 2. Website Designer (HTML Generation)
  if (tool === ToolType.WEBSITE_DESIGNER) {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: "You are an expert Web Designer. Create a single, complete, responsive HTML file using Tailwind CSS (via CDN). The design should be modern, clean, and professional. Return ONLY the raw HTML code starting with <!DOCTYPE html>. Do not wrap in markdown code blocks.",
        }
    });
    let html = response.text || "";
    // Clean markdown if present
    html = html.replace(/```html/g, '').replace(/```/g, '');
    return { html, code: html };
  }
  
  // 3. Image Lab (General Editing)
  if (tool === ToolType.IMAGE_LAB) {
     if (!base64Image) throw new Error("Please upload an image for Image Lab.");
     
     const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: base64Image, mimeType: mimeType || 'image/png' } },
                { text: `Edit this image based on: ${prompt}` }
            ]
        }
     });
     
     let imageUrl = "";
     if (response.candidates?.[0]?.content?.parts) {
         for (const part of response.candidates[0].content.parts) {
             if (part.inlineData) {
                 imageUrl = `data:image/png;base64,${part.inlineData.data}`;
             }
         }
     }
     return { imageUrl };
  }

  return {};
};

// Text to Speech (Conversational)
export const generateVoiceChat = async (input: string | { audioData: string }, mode: 'TEXT' | 'AUDIO'): Promise<string> => {
    const ai = getClient();
    try {
        let contents;
        
        if (mode === 'AUDIO' && typeof input !== 'string') {
             contents = {
                parts: [
                    { inlineData: { mimeType: "audio/wav", data: input.audioData } },
                    { text: "Listen to this audio and respond naturally." } // Prompt to guide the model
                ]
            };
        } else {
            contents = { parts: [{ text: input as string }] };
        }

        const response = await ai.models.generateContent({
            model: mode === 'AUDIO' ? "gemini-2.5-flash-native-audio-preview-09-2025" : "gemini-2.5-flash-preview-tts",
            contents: contents,
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, 
                    },
                },
            },
        });
        
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data returned");
        return base64Audio;
    } catch (e) {
        console.error(e);
        throw new Error("Voice generation failed.");
    }
}
