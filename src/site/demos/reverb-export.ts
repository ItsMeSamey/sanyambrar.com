// Matches Reverb's exportFrameLimit: whole PCM frames for RIFF, 36-bit frames for FLAC.
export function reverbExportLimitSeconds(dropdowns: readonly string[], compression: boolean): number {
  const [channelLabel = 'Mono', sampleFormatLabel = '16-bit integer', rateLabel = '44.1 kHz'] = dropdowns;
  const rateKhz = Number.parseFloat(rateLabel);
  const sampleRate = Number.isFinite(rateKhz) && rateKhz > 0 ? Math.round(rateKhz * 1000) : 44_100;
  if (compression) return 0xf_ffff_ffff / sampleRate;
  const channelCount = channelLabel === 'Stereo' ? 2 : 1;
  const bytesPerSample = sampleFormatLabel === '8-bit integer' ? 1 : sampleFormatLabel === '32-bit float' ? 4 : 2;
  const headerBytes = sampleFormatLabel === '32-bit float' ? 58 : 44;
  const frameBytes = channelCount * bytesPerSample;
  const payloadBudget = Math.max(0, 0xffff_ffff + 8 - headerBytes - (bytesPerSample === 1 ? 1 : 0));
  const frameAlignedPayload = payloadBudget - payloadBudget % frameBytes;
  return frameAlignedPayload / (sampleRate * frameBytes);
}
