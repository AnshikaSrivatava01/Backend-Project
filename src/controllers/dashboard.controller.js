import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/likes.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const channelId = req.user._id;
    const channelStats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $group: {
                _id: "$owner",

                totalVideos: {
                    $sum: 1
                },

                totalViews: {
                    $sum: "$views"
                },

                totalLikes: {
                    $sum: {
                        $size: "$likes"
                    }
                }
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                let:{
                    channelId: "$_id"
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ["$channel", "$$channelId"]
                            }
                        }
                    }
                ], as: "subscribers"
            }
        },
        {
            $addFields: {
                totalSubscribers: {
                    $size: "$subscribers"
                }
            }
        },
        {
            $project: {
                _id: 0,
                totalVideos: 1,
                totalViews: 1,
                totalLikes: 1,
                totalSubscribers: 1
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, channelStats[0] || {
            totalVideos: 0,
            totalViews: 0,
            totalLikes: 0,
            totalSubscribers: 0
        }, "Channel stats fetched successfully")
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const channelId = req.user._id;

    if(!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Invalid chaneel ID")
    }

    const channel = await User.findById(channelId)

    if(!channel) {
        throw new ApiError(404, "Channel not found")
    }

    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                }
            }
        },
        {
            $project: {
                title: 1,
                description: 1,
                thumbnail: 1,
                duration: 1,
                views: 1,
                createdAt: 1,
                isPublished: 1,
                likesCount: 1
            }
        },

        {
            $sort: {
                createdAt: -1
            }
        }
    ]);

     return res.status(200).json(
        new ApiResponse(
            200,
            videos,
            "Channel videos fetched successfully"
        )
    );
})

export {
    getChannelStats, 
    getChannelVideos
    }