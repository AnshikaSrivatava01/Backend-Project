import redis from './redis.js';
import { ApiResponse } from '../utils/apiResponse.js';  // Adjust path to your utils

export const cacheManager = {
  /**
   * 1. Safe Find: Returns ApiResponse on HIT, null on MISS or FAILURE
   */
  async get(key) {
    try {
      const data = await redis.get(key);
      if (!data) return null; // Standard Cache Miss
      
      const parsedData = JSON.parse(data);
      
      // Cache Hit: Hand back a beautiful, ready-to-use ApiResponse instance
      return new ApiResponse(200, parsedData, "Data fetched from cache successfully");
    } catch (error) {
      // REDIS FAILED: Log it for the developer, but return null so the controller safely drops back to MongoDB!
      console.error(`❌ Redis Fault [Get Key: ${key}]:`, error);
      return null; 
    }
  },

  /**
   * 2. Safe Store: Returns true on success, false on failure (doesn't crash the app)
   */
  async set(key, value, ttlInSeconds = 3600) {
    try {
      const serializedData = JSON.stringify(value);
      await redis.setex(key, ttlInSeconds, serializedData);
      return true;
    } catch (error) {
      console.error(`❌ Redis Fault [Set Key: ${key}]:`, error);
      return false; // App keeps moving even if caching failed
    }
  },

  /**
   * 3. Safe Delete: Returns true on success, false on failure
   */
  async delete(key) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      console.error(`❌ Redis Fault [Delete Key: ${key}]:`, error);
      return false;
    }
  }
};