import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//routes

import userRouter from "./routes/user.router.js"
import videoRouter from "./routes/video.router.js"
import playlistRouter from "./routes/playlist.route.js"
import commemtRouter from "./routes/comment.router.js"
import healthcheckRouter from "./routes/healthcheck.router.js"
import dashboardRouter from "./routes/dashboard.router.js"
import tweetRouter from "./routes/tweet.router.js"
import subscriptionRouter from "./routes/subscription.router.js"
import likeRouter from "./routes/like.router.js"

//routes declaration
app.use("/api/v1/users", userRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/comment", commemtRouter)
app.use("/api/v1/healthcheck",  healthcheckRouter)
app.use("/api/v1/dashboard",  dashboardRouter)
app.use("/api/v1/tweet",  tweetRouter)
app.use("/api/v1/subscription",  subscriptionRouter)
app.use("/api/v1/like", likeRouter)

export { app }