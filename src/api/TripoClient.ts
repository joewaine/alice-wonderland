/**
 * TripoClient - Converts images to 3D models via Tripo3D API
 *
 * Takes 2D reference images and generates GLB models using
 * Tripo3D's image-to-model pipeline.
 */

const TRIPO_API_URL = 'https://api.tripo3d.ai/v2/openapi';

export interface ModelResult {
  glbUrl: string;
  taskId: string;
}

export class TripoClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Convert an image URL to a 3D GLB model
   */
  async imageToModel(imageUrl: string): Promise<ModelResult> {
    console.log('Submitting to Tripo3D...');

    const response = await fetch(`${TRIPO_API_URL}/task`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'image_to_model',
        file: {
          type: 'url',
          url: imageUrl
        },
        model_version: 'v2.5-20250123'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tripo API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(`Tripo API error: ${data.message}`);
    }

    const taskId = data.data.task_id;
    console.log('Task submitted, task_id:', taskId);

    // Poll for completion
    const glbUrl = await this.pollForCompletion(taskId);

    return { glbUrl, taskId };
  }

  /**
   * Generate a 3D model directly from text prompt
   */
  async textToModel(prompt: string): Promise<ModelResult> {
    console.log('Submitting text-to-model to Tripo3D...');

    const response = await fetch(`${TRIPO_API_URL}/task`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'text_to_model',
        prompt: prompt,
        model_version: 'v2.5-20250123'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tripo API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(`Tripo API error: ${data.message}`);
    }

    const taskId = data.data.task_id;
    console.log('Task submitted, task_id:', taskId);

    // Poll for completion
    const glbUrl = await this.pollForCompletion(taskId);

    return { glbUrl, taskId };
  }

  /**
   * Poll task status until complete
   */
  private async pollForCompletion(taskId: string): Promise<string> {
    const maxAttempts = 90; // 3 minutes max (3D generation is slow)

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(2000);

      const statusRes = await fetch(`${TRIPO_API_URL}/task/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const statusData = await statusRes.json();
      const status = statusData.data?.status;
      const progress = statusData.data?.progress || 0;

      console.log(`Polling... status: ${status}, progress: ${progress}% (attempt ${attempt + 1})`);

      if (status === 'success') {
        const output = statusData.data.output;
        const glbUrl = output?.model || output?.pbr_model || output?.base_model;

        if (glbUrl) {
          console.log('3D model generated successfully!');
          return glbUrl;
        }

        throw new Error('No GLB URL in response');
      }

      if (status === 'failed') {
        throw new Error(`3D conversion failed: ${JSON.stringify(statusData)}`);
      }
    }

    throw new Error('Timeout waiting for 3D conversion');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Download a GLB file from URL and return as ArrayBuffer
 */
export async function downloadGLB(glbUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(glbUrl);
  if (!response.ok) {
    throw new Error(`Failed to download GLB: ${response.status}`);
  }

  return response.arrayBuffer();
}
