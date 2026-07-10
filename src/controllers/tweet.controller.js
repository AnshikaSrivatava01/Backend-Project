import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweets.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { app } from "../app.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body;

    if(!content || !content.trim()) {
        throw new ApiError(400, "Tweet content is required")
    }

    const tweet = await Tweet.create({
        content: content.trim(),
        owner: req.user._id
    })

    const createdTweet = await Tweet.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(tweet._id)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: {
                    _id: "$owner._id",
                    fullname: "$owner.fullname",
                    username: "$owner.username",
                    avatar: "$owner.avatar"
                }
            }
        }
    ]);

    return res.status(200).json(new ApiResponse(200, createdTweet[0], "Tweet created successfully"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params;
    const {page = 1, limit = 10} = req.query

    if(!mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(404, "User not found")
    }

    const aggregate = Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
             $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },

        {
            $unwind: "$owner"
        },

        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes"
            }
        },

        {
            $addFields: {

                likesCount: {
                    $size: "$likes"
                },

                isLiked: {
                    $in: [
                        req.user._id,
                        "$likes.likedBy"
                    ]
                }

            }
        },

        {
            $project: {

                content: 1,
                createdAt: 1,
                updatedAt: 1,
                likesCount: 1,
                isLiked: 1,

                owner: {
                    _id: "$owner._id",
                    fullname: "$owner.fullname",
                    username: "$owner.username",
                    avatar: "$owner.avatar"
                }

            }
        },

        {
            $sort: {
                createdAt: -1
            }
        }   
    ]);

    const options = {
        page: Number(page),
        limit: Number(limit)
    };

    const tweets = await Tweet.aggregatePaginate( aggregate, options);

    return res.status(200).json(
        new ApiResponse(200, tweets, "User tweets fetched successfully")
    )
});

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params;
    const {content} = req.body;

    if(!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid Tweet ID")
    }

    if(!content || !content.trim()) {
        throw new ApiError(400, "Tweet content is required")
    }

    const tweet  = await Tweet.findById(tweetId);

    if(!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    if(tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorised to update this tweet");
    }

    await Tweet.findByIdAndUpdate(
        tweetId, 
        {
            $set: {
                content: content.trim()
            }
        },
        {
            new: true,
            runValidators: true
        }
    );

    const updatedTweet = await Tweet.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(tweetId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $addFields: {
                likesCount: {
                    $size: {
                        $ifNull: ["$likes", []]
                    }
                }
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                updatedAt: 1,
                likesCount: 1,
                isLiked: 1,

                owner: {
                    _id: "$owner._id",
                    fullname: "$owner.fullname",
                    username: "$owner.username",
                    avatar: "$owner.avatar",
                }
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(200, updatedTweet[0], "Tweet updated successfully")
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params

    if(!mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Invalid Tweet Id")
    }

    const tweet = await Tweet.findById(tweetId)

    if(!tweet){
        throw new ApiError(404, "Tweet not found")
    }

    if (tweet.owner.toString() !== req.user._id.toString()) {
       throw new ApiError(403, "You are not authorised to delete this tweet") 
    }

    await Tweet.findByIdAndDelete(tweetId)

    return res.status(200).json(new ApiResponse(
        200, {}, "Tweet deleted successfully"
    ))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}