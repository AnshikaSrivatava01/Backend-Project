import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/likes.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comments.model.js"
import { Tweet } from "../models/tweets.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params

    if(!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid Video ID")
    }

    const video = await Video.findById(videoId)

    if(!video) {
        throw new ApiError(404, "Video not found")
    }

    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: req.user._id
    })

    if(existingLike) {
        await Like.findByIdAndDelete(existingLike._id)

        return res.status(200).json(new ApiResponse(
            200,
            {
                liked: false
            },
            "Video unliked successfully"
        ))
    }

    await Like.create({
        video: videoId,
        likedBy: req.user._id
    })

    return res.status(201).json(new ApiResponse(
            201,
            {
                liked: true
            },
            "Video liked successfully"
        )
    ); 
    //TODO: toggle like on video
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment

     if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid Comment ID");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    const deletedLike = await Like.findOneAndDelete({
        comment: commentId,
        likedBy: req.user._id
    })

    if(deletedLike) {
        return res.status(200).json(new ApiResponse(
            200,{
                liked: false
            },
            "Comment unliked successfully"
        ))
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user._id
    })

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                liked: true
            },
            "Comment liked successfully"
        )
    );
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid Tweet ID");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

     const deletedLike = await Like.findOneAndDelete({
        tweet: tweetId,
        likedBy: req.user._id
    });

    if (deletedLike) {

        const likesCount = await Like.countDocuments({
            tweet: tweetId
        });

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    liked: false,
                    likesCount
                },
                "Tweet unliked successfully"
            )
        );
    }

    // Like Tweet
    await Like.create({
        tweet: tweetId,
        likedBy: req.user._id
    });

    const likesCount = await Like.countDocuments({
        tweet: tweetId
    });

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                liked: true,
                likesCount
            },
            "Tweet liked successfully"
        )
    );
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id),
                video: {
                    $exists: true,
                    $ne: null
                }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video"
            }
        },
        {
            $unwind: "$video"
        },
        {
            $lookup: {
                from: "users",
                localField: "video.owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
        $unwind: "$owner"
        },
        {
        $project: {
            _id: 0,
            likedAt: "$createdAt",
            video: {
                _id: "$video._id",
                title: "$video.title",
                description: "$video.description",
                thumbnail: "$video.thumbnail",
                duration: "$video.duration",
                views: "$video.views",
                createdAt: "$video.createdAt",
                owner: {
                    _id: "$owner._id",
                    fullname: "$owner.fullname",
                    username: "$owner.username",
                    avatar: "$owner.avatar"
                    }
                }
            }
        },{
            $sort: {
                likedAt: -1
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(
            200,
            likedVideos,
            "Liked videos fetched successfully"
        )
    );
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}