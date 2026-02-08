import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { VideoService } from '../video/video.service';

@Injectable()
export class RecordingsService {
  constructor(
    private prisma: PrismaService,
    private videoService: VideoService,
  ) {}

  async findByEvent(eventId: string) {
    return this.prisma.recording.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return this.prisma.recording.findUnique({
      where: { id },
    });
  }

  async createFromWebhook(eventId: string, provider: string, providerAssetId: string) {
    return this.prisma.recording.create({
      data: {
        eventId,
        provider,
        providerAssetId,
        status: 'processing',
      },
    });
  }

  async updateFromWebhook(providerAssetId: string, data: {
    playbackUrl?: string;
    downloadUrl?: string;
    durationSeconds?: number;
    status?: 'processing' | 'ready' | 'failed';
    fileSize?: number;
  }) {
    const recording = await this.prisma.recording.findFirst({
      where: { providerAssetId },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    return this.prisma.recording.update({
      where: { id: recording.id },
      data: {
        playbackUrl: data.playbackUrl,
        downloadUrl: data.downloadUrl,
        durationSeconds: data.durationSeconds,
        status: data.status,
        fileSize: data.fileSize,
      },
    });
  }

  async refreshRecordingInfo(id: string) {
    const recording = await this.findById(id);
    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    const info = await this.videoService.getRecording(recording.providerAssetId);

    return this.prisma.recording.update({
      where: { id },
      data: {
        playbackUrl: info.playbackUrl,
        downloadUrl: info.downloadUrl,
        durationSeconds: info.duration,
        status: info.status,
      },
    });
  }

  async delete(id: string) {
    await this.prisma.recording.update({
      where: { id },
      data: { status: 'deleted' },
    });
  }
}
