import Redis from 'ioredis';

// Docker Compose automatically passes this down via environment variables
const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
    console.error(" REDIS_URL is not defined in the environment variables!");
}

// Initialize the client connection instance
const redis = new Redis(redisUrl, {
    // 💥 CHANGED: Changed from 3 to null so ioredis never hard-crashes your Express process
    maxRetriesPerRequest: null,
    
    // 🔒 ADDED: Critical encryption object required for secure cloud handshakes (Upstash)
    tls: {},
    
    // ⏱️ ADDED: Sets an explicit connection window for cloud network latency
    connectTimeout: 10000,
    
    retryStrategy(times) {
        // Automatically attempts reconnection if it drops
        const delay = Math.min(times * 100, 3000);
        return delay;
    }
});

redis.on('connect', () => {
    //  CHANGED: Updated string to accurately reflect cloud connection status
    console.log(' Redis Connected successfully to the cloud database!');
});

redis.on('error', (err) => {
    // CHANGED: Safely extracts err.message to avoid printing massive block stacks on minor logs
    console.error(' Redis Connection Error:', err.message || err);
});

export default redis;