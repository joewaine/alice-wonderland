/**
 * ComfyUIClient - Generates images via ComfyUI Cloud API
 *
 * Uses the cloud API at cloud.comfy.org to generate N64-style
 * images for skyboxes and character references.
 */

const BASE_URL = 'https://cloud.comfy.org';

// N64-style prompt prefix for consistent visual style
export const N64_STYLE_PREFIX = `low poly 3D render, N64 style, chunky vertices, simple geometry,
bright saturated colors, clean white background, no realistic textures,
video game asset, Banjo-Kazooie style`;

export const NEGATIVE_PROMPT = `realistic, high poly, detailed textures, photorealistic,
complex lighting, shadows, blurry, watermark, text`;

export interface GenerationResult {
  imageUrl: string;
  promptId: string;
}

export class ComfyUIClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Generate an image with N64-style prompt
   */
  async generateImage(prompt: string): Promise<GenerationResult> {
    const fullPrompt = `${N64_STYLE_PREFIX}, ${prompt}`;

    // ComfyUI workflow for txt2img
    const workflow = {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "seed": Math.floor(Math.random() * 1000000),
          "steps": 20,
          "cfg": 7,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1,
          "model": ["4", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["5", 0]
        }
      },
      "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": "dreamshaper_8.safetensors"
        }
      },
      "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "width": 512,
          "height": 512,
          "batch_size": 1
        }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": fullPrompt,
          "clip": ["4", 1]
        }
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "text": NEGATIVE_PROMPT,
          "clip": ["4", 1]
        }
      },
      "8": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        }
      },
      "9": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "alice_asset",
          "images": ["8", 0]
        }
      }
    };

    // Submit workflow
    console.log('Submitting to ComfyUI Cloud...');
    const response = await fetch(`${BASE_URL}/api/prompt`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt: workflow })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ComfyUI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const promptId = data.prompt_id;
    console.log('Job submitted, prompt_id:', promptId);

    // Poll for completion
    const imageUrl = await this.pollForCompletion(promptId);

    return { imageUrl, promptId };
  }

  /**
   * Poll job status until complete
   */
  private async pollForCompletion(promptId: string): Promise<string> {
    const maxAttempts = 60; // 2 minutes max

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(2000);

      const statusRes = await fetch(`${BASE_URL}/api/job/${promptId}/status`, {
        headers: { 'X-API-Key': this.apiKey }
      });

      if (!statusRes.ok) {
        console.log(`Polling error: ${statusRes.status}`);
        continue;
      }

      const statusData = await statusRes.json();
      console.log(`Polling... status: ${statusData.status} (attempt ${attempt + 1})`);

      if (statusData.status === 'completed' || statusData.status === 'success') {
        // Extract image URL from outputs
        if (statusData.outputs) {
          for (const nodeId in statusData.outputs) {
            const nodeOutput = statusData.outputs[nodeId];
            if (nodeOutput.images && nodeOutput.images.length > 0) {
              const imageInfo = nodeOutput.images[0];
              const params = new URLSearchParams({
                filename: imageInfo.filename,
                subfolder: imageInfo.subfolder || '',
                type: 'output'
              });

              const viewRes = await fetch(`${BASE_URL}/api/view?${params}`, {
                headers: { 'X-API-Key': this.apiKey },
                redirect: 'follow'
              });

              return viewRes.url;
            }
          }
        }

        // Try history endpoint as fallback
        const historyRes = await fetch(`${BASE_URL}/api/history_v2/${promptId}`, {
          headers: { 'X-API-Key': this.apiKey }
        });

        if (historyRes.ok) {
          const historyData = await historyRes.json();
          if (historyData.outputs) {
            for (const nodeId in historyData.outputs) {
              const nodeOutput = historyData.outputs[nodeId];
              if (nodeOutput.images && nodeOutput.images.length > 0) {
                const imageInfo = nodeOutput.images[0];
                const params = new URLSearchParams({
                  filename: imageInfo.filename,
                  subfolder: imageInfo.subfolder || '',
                  type: 'output'
                });

                const viewRes = await fetch(`${BASE_URL}/api/view?${params}`, {
                  headers: { 'X-API-Key': this.apiKey },
                  redirect: 'follow'
                });

                return viewRes.url;
              }
            }
          }
        }

        throw new Error('No output images found in response');
      }

      if (statusData.status === 'failed') {
        throw new Error(`Generation failed: ${JSON.stringify(statusData)}`);
      }
    }

    throw new Error('Timeout waiting for image generation');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
