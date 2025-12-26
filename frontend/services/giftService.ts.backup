import { supabase } from '../lib/supabase';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export interface Gift {
  id: string;
  name: string;
  price: number;
  icon: string;
  tier: 'LOW' | 'MID' | 'HIGH' | 'ULTRA' | 'NUCLEAR';
  format: 'lottie' | 'mp4';
  blocks_others?: boolean;
  is_cinematic?: boolean;
  animation_url?: string;
  duration_ms: number;
}

export interface GiftTransaction {
  id: string;
  stream_id: string;
  sender_id: string;
  receiver_id: string;
  gift_id: string;
  amount: number;
  created_at: string;
  sender?: {
    username: string;
    avatar_url?: string;
  };
  gift?: Gift;
}

export const giftService = {
  // Get gift catalog
  async getGifts(): Promise<Gift[]> {
    const { data, error } = await supabase
      .from('gifts')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      console.error('Get gifts error:', error);
      // Fallback to backend API
      try {
        const res = await axios.get(`${API_URL}/api/gifts/catalog`);
        return res.data.gifts;
      } catch {
        return [];
      }
    }
    return data || [];
  },

  // Get gifts by tier
  async getGiftsByTier(tier: Gift['tier']): Promise<Gift[]> {
    const { data, error } = await supabase
      .from('gifts')
      .select('*')
      .eq('tier', tier)
      .order('price', { ascending: true });

    if (error) {
      console.error('Get gifts by tier error:', error);
      return [];
    }
    return data || [];
  },

  // Send a gift
  async sendGift(
    streamId: string,
    senderId: string,
    receiverId: string,
    gift: Gift
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check sender balance
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', senderId)
        .single();

      if (!wallet || wallet.balance < gift.price) {
        return { success: false, error: 'Insufficient balance' };
      }

      // Deduct from sender wallet
      await supabase
        .from('wallets')
        .update({ 
          balance: wallet.balance - gift.price,
          total_spent: (wallet as any).total_spent + gift.price 
        })
        .eq('user_id', senderId);

      // Add to receiver wallet (70% of gift value)
      const receiverAmount = Math.floor(gift.price * 0.7);
      const { data: receiverWallet } = await supabase
        .from('wallets')
        .select('balance, total_earned')
        .eq('user_id', receiverId)
        .single();

      if (receiverWallet) {
        await supabase
          .from('wallets')
          .update({ 
            balance: receiverWallet.balance + receiverAmount,
            total_earned: (receiverWallet as any).total_earned + receiverAmount 
          })
          .eq('user_id', receiverId);
      }

      // Record transaction
      const { error } = await supabase.from('gift_transactions').insert({
        stream_id: streamId,
        sender_id: senderId,
        receiver_id: receiverId,
        gift_id: gift.id,
        amount: gift.price,
      });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Send gift error:', error);
      return { success: false, error: error.message || 'Failed to send gift' };
    }
  },

  // Get wallet balance
  async getWalletBalance(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      // Create wallet if doesn't exist
      await supabase.from('wallets').insert({
        user_id: userId,
        balance: 100, // Welcome bonus
      });
      return 100;
    }
    return data.balance;
  },

  // Subscribe to gifts in a stream
  subscribeToGifts(streamId: string, callback: (gift: GiftTransaction) => void) {
    return supabase
      .channel(`gifts:${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gift_transactions',
          filter: `stream_id=eq.${streamId}`,
        },
        async (payload) => {
          const tx = payload.new as GiftTransaction;
          
          // Fetch sender and gift info
          const [{ data: sender }, { data: gift }] = await Promise.all([
            supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', tx.sender_id)
              .single(),
            supabase
              .from('gifts')
              .select('*')
              .eq('id', tx.gift_id)
              .single(),
          ]);

          callback({ ...tx, sender, gift });
        }
      )
      .subscribe();
  },

  // Get gift by ID
  async getGiftById(giftId: string): Promise<Gift | null> {
    const { data, error } = await supabase
      .from('gifts')
      .select('*')
      .eq('id', giftId)
      .single();

    if (error) {
      console.error('Get gift by ID error:', error);
      return null;
    }
    return data;
  },

  // Check if gift blocks other gifts
  shouldBlockOtherGifts(gift: Gift): boolean {
    return gift.blocks_others === true || gift.tier === 'ULTRA' || gift.tier === 'NUCLEAR';
  },

  // Get gift display duration
  getGiftDuration(gift: Gift): number {
    return gift.duration_ms || 3000;
  },
};
