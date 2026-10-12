import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'heiss-video-duration-'));
process.env.HEISS_DATA_DIR = scratch;
const { saveCustomWorkflow } = await import('./custom-workflows.js');
const { inferModels } = await import('./models.js');
const { sanitizeGenerateBody } = await import('./validation.js');
const { customWorkflowGraph } = await import('./graphs.js');
const { durationOptions } = await import('../src/app/videoDuration.js');
test.after(() => fs.rmSync(scratch, { recursive: true, force: true }));

const node = (inputs) => ({ input: { required: inputs } });
const info = {
  CLIPTextEncode: node({}),
  VAEDecode: node({}),
  SaveImage: node({}),
  MiniMaxH3ImageToVideo: node({ prompt: ['STRING'], length: ['INT', { default: 124, min: 5, max: 3600, step: 17 }] }),
  CreateVideo: node({ fps: ['FLOAT', { default: 24, min: 1, max: 120 }] }),
  SaveVideo: node({}),
  KSampler: node({ sampler_name: [['euler']], scheduler: [['simple']] })
};

test('custom H3 duration selections reach their mapped graph input with the fixed workflow FPS', async () => {
  for (const family of ['minimax-h3', 'minimax_h3']) {
    saveCustomWorkflow({
      heissUi: { id: 'duration-h3', kind: 'video', family, defaults: { fps: 24, steps: 8 }, controls: { prompt: { node: '4', input: 'prompt' }, frames: { node: '4', input: 'length' } } },
      4: { class_type: 'MiniMaxH3ImageToVideo', inputs: { prompt: 'waves', length: 124 } },
      5: { class_type: 'CreateVideo', inputs: { images: ['4', 0], fps: 24 } },
      6: { class_type: 'SaveVideo', inputs: { video: ['5', 0], filename_prefix: 'test' } }
    });
    const profile = inferModels(info).profiles.find((item) => item.id === 'custom:duration-h3');
    assert.ok(profile);
    for (const option of durationOptions(profile, 141, 24)) {
      const frames = Number(option.value);
      const body = sanitizeGenerateBody({ kind: 'video', workflow: profile.workflow, model: profile.model, prompt: 'waves', frames, fps: 60 }, info);
      assert.equal(body.frames, frames);
      assert.equal(body.fps, 24);
      const graph = await customWorkflowGraph(body);
      assert.equal(graph['4'].inputs.length, frames);
      assert.equal(graph['5'].inputs.fps, 24);
    }
  }
});
