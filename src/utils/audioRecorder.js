/**
 * audioRecorder.js — Standard 16 kHz Mono PCM WAV Recorder for VoiceGuard Pro.
 *
 * Records Float32 PCM directly from microphone stream in real-time, producing
 * a pure 16-bit PCM WAV Blob that requires zero browser WebM decoding or server FFmpeg.
 */

export function encodeWAV(pcmFloat32, sampleRate = 16000) {
  const numSamples = pcmFloat32.length;
  const bytesPerSample = 2; // 16-bit PCM
  const dataLen = numSamples * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLen);
  const view = new DataView(buffer);

  const writeStr = (off, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataLen, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);          // PCM chunk size
  view.setUint16(20, 1, true);           // PCM format
  view.setUint16(22, 1, true);           // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);          // 16 bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataLen, true);

  const int16 = new Int16Array(buffer, 44);
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, pcmFloat32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

export async function convertBlobToWav(rawBlob, targetSr = 16000) {
  if (rawBlob.type === 'audio/wav' || rawBlob.type === 'audio/x-wav') {
    const buf = await rawBlob.arrayBuffer();
    const view = new DataView(buf);
    if (view.byteLength >= 12 && view.getUint32(0) === 0x52494646 && view.getUint32(8) === 0x57415645) {
      return rawBlob; // Already valid RIFF WAVE
    }
  }

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const arrayBuffer = await rawBlob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

    const offlineCtx = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * targetSr), targetSr);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    const pcmData = renderedBuffer.getChannelData(0);
    return encodeWAV(pcmData, targetSr);
  } catch (err) {
    console.warn('[AudioRecorder] WebAudio decode failed, returning raw blob:', err);
    return rawBlob;
  } finally {
    if (audioCtx.state !== 'closed') {
      await audioCtx.close();
    }
  }
}

/**
 * Start direct PCM recording from a MediaStream.
 * Returns { stop: () => Promise<Blob>, analyserNode, audioCtx }
 */
export function startDirectPcmRecorder(stream, targetSr = 16000) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: targetSr });
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 128;

  const bufferSize = 4096;
  const processor = audioCtx.createScriptProcessor(bufferSize, 1, 1);

  const pcmChunks = [];

  processor.onaudioprocess = (e) => {
    const inputChannel = e.inputBuffer.getChannelData(0);
    pcmChunks.push(new Float32Array(inputChannel));
  };

  source.connect(analyser);
  analyser.connect(processor);
  processor.connect(audioCtx.destination);

  let stopped = false;

  return {
    analyser,
    audioCtx,
    stop: async () => {
      if (stopped) return null;
      stopped = true;

      processor.disconnect();
      analyser.disconnect();
      source.disconnect();

      stream.getTracks().forEach(track => track.stop());

      if (audioCtx.state !== 'closed') {
        await audioCtx.close();
      }

      let totalSamples = 0;
      for (const chunk of pcmChunks) {
        totalSamples += chunk.length;
      }

      const mergedPcm = new Float32Array(totalSamples);
      let offset = 0;
      for (const chunk of pcmChunks) {
        mergedPcm.set(chunk, offset);
        offset += chunk.length;
      }

      const wavBlob = encodeWAV(mergedPcm, targetSr);
      console.log(`[AudioRecorder] Direct PCM recorded: ${totalSamples} samples (${(totalSamples / targetSr).toFixed(2)}s), ${wavBlob.size} bytes`);
      return wavBlob;
    }
  };
}
