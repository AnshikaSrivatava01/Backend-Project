import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription

    if(!mongoose.Types.ObjectId.isValid(channelId)){
         throw new ApiError(400, "Invalid Channel ID");
    }

     if (channelId === req.user._id.toString()) {
        throw new ApiError(400, "You cannot subscribe to your own channel");
    }

    const channel = await User.findById(channelId)

    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    const existingSubscription = await Subscription.findOne({
        subscriber : req.user._id,
        channel: channelId
    })

    if(existingSubscription) {
        await Subscription.findByIdAndDelete(existingSubscription._id)

        return res.status(200).json(
            new ApiResponse(
                200,
                {
                    subscribed: false
                },
                "Channel unsubscribed successfully"
            )
        );
    }

    await Subscription.create({
        subscriber: req.user._id,
        channel: channelId
    })

    return res.status(201).json(
        new ApiResponse(
            201,
            {
                subscribed: true
            },
            "Channel subscribed successfully"
        )
    );
    
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

     if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Invalid Channel ID");
    }

    const channel = await User.findById(channelId);

    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    const subscribers = await Subscription.aggregate([

        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },

        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber"
            }
        },

        {
            $unwind: "$subscriber"
        },

        {
            $project: {
                _id: 0,

                subscriber: {
                    _id: "$subscriber._id",
                    fullname: "$subscriber.fullname",
                    username: "$subscriber.username",
                    avatar: "$subscriber.avatar"
                },

                subscribedAt: "$createdAt"
            }
        },

        {
            $sort: {
                subscribedAt: -1
            }
        }

    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            subscribers,
            "Subscribers fetched successfully"
        )
    );

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
        throw new ApiError(400, "Invalid Subscriber ID");
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel"
            }
        },
        {
            $unwind: "$channel"
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "channel._id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "channel._id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "channel._id",
                foreignField: "owner",
                as: "videos"
            }
        },
        {
            $addFields: {
                "channel.subscribersCount": {
                    $size: {
                        $ifNull: ["$subscribers", []]
                    }
                },
                "channel.channelsSubscribedToCount": {
                    $size: {
                        $ifNull: ["$subscribedTo", []]
                    }
                },
                "channel.videosCount": {
                    $size: {
                        $ifNull: ["$videos", []]
                    }
                },
                "channel.isSubscribed": {
                    $in: [
                        req.user._id,
                        "$subscribers.subscriber"
                    ]
                }
            }
        },
        {
            $project: {
                _id: 0,
                subscribedAt: "$createdAt",
                channel: {
                    _id: "$channel._id",
                    fullname: "$channel.fullname",
                    username: "$channel.username",
                    avatar: "$channel.avatar",
                    subscribersCount: "$channel.subscribersCount",
                    channelsSubscribedToCount:
                        "$channel.channelsSubscribedToCount",
                    videosCount: "$channel.videosCount",
                    isSubscribed: "$channel.isSubscribed"
                }
            }
        },
        {
            $sort: {
                subscribedAt: -1
            }
        }
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            subscribedChannels,
            "Subscribed channels fetched successfully"
        )
    );
});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}