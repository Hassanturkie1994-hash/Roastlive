import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface ModerationResult {
  flagged: boolean;
  action: 'allow' | 'block' | 'flag_for_review';
  categories: {
    harassment: boolean;
    hate: boolean;
    sexual: boolean;
    violence: boolean;
  };
  categoryScores: {
    harassment: number;
    hate: number;
    sexual: number;
    violence: number;
  };
}

export const moderationService = {
  async moderateText(
    text: string,
    userId: string,
    contentType: 'username' | 'bio' | 'message'
  ): Promise<ModerationResult> {
    try {
      const response = await axios.post(`${API_URL}/api/moderate/text`, {
        text,
        userId,
        contentType,
      });
      return response.data;
    } catch (error) {
      console.error('Moderation error:', error);
      throw error;
    }
  },
};
