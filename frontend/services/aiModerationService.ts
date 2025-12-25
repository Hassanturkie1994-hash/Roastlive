import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const EMERGENT_LLM_KEY = process.env.EMERGENT_LLM_KEY;

export interface ModerationResult {
  flagged: boolean;
  score: number;
  action: 'allow' | 'flag' | 'hide' | 'timeout' | 'block';
  categories: {
    toxicity: number;
    harassment: number;
    hate_speech: number;
    sexual: number;
    threats: number;
    spam: number;
  };
}

export const aiModerationService = {
  // Moderate chat message
  async moderateMessage(message: string): Promise<ModerationResult> {
    try {
      const response = await axios.post(`${API_URL}/api/moderation/message`, {
        message,
      });
      return response.data;
    } catch (error) {
      console.error('AI moderation error:', error);
      // Fail-safe: allow message if moderation fails
      return {
        flagged: false,
        score: 0,
        action: 'allow',
        categories: {
          toxicity: 0,
          harassment: 0,
          hate_speech: 0,
          sexual: 0,
          threats: 0,
          spam: 0,
        },
      };
    }
  },

  // Moderate profile content (username, bio)
  async moderateProfile(username: string, bio?: string): Promise<ModerationResult> {
    try {
      const response = await axios.post(`${API_URL}/api/moderation/profile`, {
        username,
        bio,
      });
      return response.data;
    } catch (error) {
      console.error('Profile moderation error:', error);
      return {
        flagged: false,
        score: 0,
        action: 'allow',
        categories: {
          toxicity: 0,
          harassment: 0,
          hate_speech: 0,
          sexual: 0,
          threats: 0,
          spam: 0,
        },
      };
    }
  },

  // Get action based on score
  getActionForScore(score: number): ModerationResult['action'] {
    if (score < 0.3) return 'allow';
    if (score < 0.5) return 'flag';
    if (score < 0.7) return 'hide';
    if (score < 0.85) return 'timeout';
    return 'block';
  },

  // Check if message should be blocked
  shouldBlockMessage(result: ModerationResult): boolean {
    return result.action === 'block' || result.action === 'timeout';
  },

  // Check if message should be hidden
  shouldHideMessage(result: ModerationResult): boolean {
    return result.action === 'hide';
  },
};

export default aiModerationService;