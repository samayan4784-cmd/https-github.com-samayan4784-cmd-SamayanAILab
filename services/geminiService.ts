
import { GoogleGenAI, Modality } from "@google/genai";
import { ToolType } from "../types";

// Helper to get fresh client with the environment API key
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Audio Helpers for PCM to WAV Conversion ---
function base64ToUint8Array(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function createWavFile(pcmData: Uint8Array) {
  // Gemini 2.5 TTS default: 24kHz, 1 channel, 16-bit PCM
  const numChannels = 1;
  const sampleRate = 24000;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.length;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM data
  const headerBytes = new Uint8Array(buffer, 0, 44);
  const finalBuffer = new Uint8Array(44 + dataSize);
  finalBuffer.set(headerBytes);
  finalBuffer.set(pcmData, 44);

  return finalBuffer;
}
// ------------------------------------------------

export const generateCreativeContent = async (
  tool: ToolType,
  prompt: string,
  base64Image?: string,
  mimeType?: string
): Promise<{ text?: string; imageUrl?: string; code?: string; html?: string }> => {
  const ai = getClient();
  
  // 1. Pure Image Generation Tools (Excluded Poster Designer to fix text issues)
  if ([ToolType.LOGO_DESIGNER, ToolType.THUMBNAIL_DESIGNER, ToolType.AD_CREATOR, ToolType.ANIMATION_3D].includes(tool)) {
    
    let systemInstruction = "";
    let aspectRatio = "1:1";

    if (tool === ToolType.LOGO_DESIGNER) systemInstruction = "Create a professional, vector-style, clean logo.";
    if (tool === ToolType.AD_CREATOR) systemInstruction = "Create a high-converting, professional advertising image.";
    if (tool === ToolType.THUMBNAIL_DESIGNER) {
        systemInstruction = "Create a vibrant, high-contrast YouTube thumbnail.";
        aspectRatio = "16:9";
    }
    if (tool === ToolType.ANIMATION_3D) {
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
            model: 'gemini-2.5-flash-image',
            contents: contents,
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

  // 2. HTML Generation Tools (Website & Poster Designer)
  // Poster Designer is moved here to ensure Urdu text renders correctly via HTML/CSS
  if (tool === ToolType.WEBSITE_DESIGNER || tool === ToolType.POSTER_DESIGNER) {
    let systemInstruction = "";
    
    if (tool === ToolType.WEBSITE_DESIGNER) {
        systemInstruction = "You are an expert Web Designer. Create a single, complete, responsive HTML file using Tailwind CSS. Return ONLY raw HTML.";
    } else if (tool === ToolType.POSTER_DESIGNER) {
        systemInstruction = `
            You are an expert Graphic Designer. Create a stunning single-page HTML Poster.
            - Use Tailwind CSS for styling. 
            - IMPORTANT: Import 'Noto Nastaliq Urdu' from Google Fonts and apply it to any Urdu text for perfect rendering.
            - Design should be visually striking with gradients, shadows, and modern typography.
            - If the user provides an image, I have inserted a placeholder '__USER_IMAGE_PLACEHOLDER__'. Use this as the main hero image or background.
            - Layout should be 3:4 (Portrait) or Square, centralized and high impact.
            - Return ONLY raw HTML code.
        `;
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: systemInstruction,
        }
    });
    
    let html = response.text || "";
    html = html.replace(/```html/g, '').replace(/```/g, '');

    // Inject User Image if provided for Poster
    if (tool === ToolType.POSTER_DESIGNER && base64Image && mimeType) {
         const fullBase64 = `data:${mimeType};base64,${base64Image}`;
         // Replace the placeholder if the AI used it, otherwise inject it as a background
         if (html.includes('__USER_IMAGE_PLACEHOLDER__')) {
             html = html.replace(/__USER_IMAGE_PLACEHOLDER__/g, fullBase64);
         } else {
             // Fallback: Try to find a placeholder img src or inject into body style
             // But simpler is to trust the prompt engineering.
         }
    }

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
     let textResponse = "";
     if (response.candidates?.[0]?.content?.parts) {
         for (const part of response.candidates[0].content.parts) {
             if (part.inlineData) {
                 imageUrl = `data:image/png;base64,${part.inlineData.data}`;
             } else if (part.text) {
                 textResponse = part.text;
             }
         }
     }
     return { imageUrl, text: textResponse };
  }

  return {};
};

// Text to Speech (Conversational) - 2 Step Process for reliability
export const generateVoiceChat = async (
  input: string | { audioData: string }, 
  mimeType: string = 'audio/webm'
): Promise<{ audioData: string, text: string }> => {
  const ai = getClient();
  let responseText = "";

  // Step 1: Get Intelligent Text Response from Gemini Flash
  try {
      const model = "gemini-2.5-flash"; 
      let contents;
      
      if (typeof input === 'object' && input.audioData) {
          // Audio Input
          contents = {
              parts: [
                  { inlineData: { mimeType: mimeType, data: input.audioData } },
                  { text: "Listen to this audio and respond naturally, like a friendly and helpful AI assistant. Keep your response concise." }
              ]
          };
      } else {
          // Text Input
          contents = {
              parts: [{ text: `User said: "${input}". Respond naturally and helpfully to the user.` }]
          };
      }

      const chatResponse = await ai.models.generateContent({
          model: model,
          contents: contents
      });
      
      responseText = chatResponse.text || "I heard you, but I couldn't think of a response.";
      
  } catch (e) {
      console.error("Thinking error:", e);
      throw new Error("I couldn't understand that. Please try again.");
  }

  // Step 2: Convert Response Text to Audio using TTS
  try {
      const ttsResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: { parts: [{ text: responseText }] },
          config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                  voiceConfig: {
                      prebuiltVoiceConfig: { voiceName: 'Kore' }, 
                  },
              },
          },
      });

      const rawAudio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      
      if (rawAudio) {
         // Convert Raw PCM to WAV
         const pcmBytes = base64ToUint8Array(rawAudio);
         const wavBytes = createWavFile(pcmBytes);
         const wavBase64 = uint8ArrayToBase64(wavBytes);
         return { audioData: wavBase64, text: responseText };
      }
      
      return { audioData: "", text: responseText };

  } catch (e) {
      console.error("Speaking error:", e);
      return { audioData: "", text: responseText }; 
  }
}
