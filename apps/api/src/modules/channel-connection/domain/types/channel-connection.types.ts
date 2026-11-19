import { ChannelType } from '../../../../contracts/channel-connection.js';

/**
 * CÁC KIỂU DỮ LIỆU & GIAO DIỆN NGHIỆP VỤ KẾT NỐI KÊNH (CHANNEL CONNECTION)
 */

export interface SendMessageOptions {
  channel: ChannelType | string;
  channelAccountId: string;
  recipientId: string;
  content: string;
  attachments?: Array<{
    assetId?: string;
    url?: string;
    type?: string;
    fileName?: string;
  }>;
}

export interface DisconnectResult {
  success: boolean;
  id: string;
}

