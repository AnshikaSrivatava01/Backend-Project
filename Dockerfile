# Step 1: Use an official Node.js runtime environment as the base image
FROM node:22-alpine

# Step 2: Set the working directory inside the container
WORKDIR /usr/src/app

# Step 3: Copy package files first to leverage Docker's caching mechanism
COPY package*.json ./

# Step 4: Install clean, production-only dependencies
RUN npm ci --only=production

# Step 5: Copy the rest of your application code
COPY . .

# Step 6: Expose the port your Express server listens on (matches your .env)
EXPOSE 8000

# Step 7: Define the execution command to start your backend engine
CMD ["npm", "start"]