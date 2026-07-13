import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import {Video} from "../models/video.model.js"
import { pipeline } from "stream";

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId)
        
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return { accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    const {fullname, email, username, password} = req.body

    if([fullname, email, username, password].some((field) =>
        field?.trim() === "")){
        throw new ApiError(400, "All Fileds are required")
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }
    // console.log(req.files);

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(500, "Failed to upload avatar to Cloudinary") 
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
})

const loginUser = asyncHandler( async (req, res) => {
    //req.body -> data, username/email , find the user, password check, access & refresh token , cookies
    const {email, username, password} = req.body
    if(!username && !email){
        throw new ApiError(400, "username or email is required")
    }
    const user =  await User.findOne({
        $or: [{username}, {email}]
    });
    if(!user) {
        throw new ApiError(404, "User does not exist")
    } 

    // console.log("Entered Password:", password);
    // console.log("Stored Password:", user.password);

    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid) {
        throw new ApiError(401, "Invalid password")
    } 

   const {accessToken, refreshToken} =  await generateAccessAndRefreshTokens(user._id)
   
   const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

   const options = { 
    httpOnly: true,
    secure: false,
    sameSite: "lax"
   }

   return res.status(200)
   .cookie("accessToken", accessToken, options)
   .cookie("refreshToken", refreshToken, options)
   .json(
    new ApiResponse(200,
        {
            user: loggedInUser, accessToken, refreshToken
        }, "User loggedIn Successfully"
    )
   )
})

const logoutUser = asyncHandler(async(req, res) => {
     console.log("Logout controller called");
       await User.findByIdAndUpdate(req.user._id,{
            $unset: {refreshToken: 1}
        },
        {new: true}
        )
        const options = { 
          httpOnly: true,
          secure: true
        }

        return res.status(200)
        .clearCookie("accessToken")
        .clearCookie("refreshToken")
        .json(new ApiResponse(200, {}, "User Logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {

        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken._id);

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const { accessToken, refreshToken } =
            await generateAccessAndRefreshTokens(user._id);

        const options = {
            httpOnly: true,
            secure: true
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken },
                    "Access token refreshed"
                )
            );

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }

});
const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old Password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200).
    json(new ApiResponse(200, {}, "Password changed succesfully"))
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, "current user fetch successfully"))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullname, email} = req.body

    if (!fullname || ! email) {
        throw new ApiError(400, "All fields are required")
    }  
    
    const user = await User.findByIdAndUpdate(
        req.user?._id,
         {
            $set: {
                fullname: fullname, email: email
            }
         }, {new: true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, "Account details updated successfully"))
    
})

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id, 
        {
            $set:{
                avatar: avatar.url
            }
        }, {new: true})
        .select("-password")

    return res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully"))
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath =req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url) {
        throw new ApiError(400, "Error while uploading on cover image ")
    }

    const user = await User.findByIdAndUpdate(req.user?._id, 
        {$set:{coverImage : coverImage.url}}, {new: true}).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "Cover image updated successfully"))
})

 //aggregation pipelines
const getUserChannelProfile = asyncHandler(async(req, res) =>{
    const {username} = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }
 
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {

            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
    $addFields: {
        subscribersCount: {
            $size: {
                $ifNull: ["$subscribers", []]
            }
        },
        channelsSubscribedToCount: {
            $size: {
                $ifNull: ["$subscribedTo", []]
            }
        },
        isSubscribed: {
            $cond: {
                if: {
                    $in: [req.user?._id, "$subscribers.subscriber"]
                },
                then: true,
                else: false
            }
        }
    }
},
        {
    $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1
    }
}
    ])

    if (!channel?.length) {
       throw new ApiError(404, "Channel does not exists") 
    }

    return res.status(200).json( new ApiResponse(200, channel[0], "User channel fetched successfully"))
})

const addToWatchHistory = asyncHandler(async (req, res) => {
  const { videoId } = req.params || {};

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video Id Format ");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video Does Not Exists In Our Database");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $addToSet: {
        watchHistory: videoId,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  video.views += 1;
  await video.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedUser,
        "Video added to watchHistory Succesfully"
      )
    );
});

const getWatchHistory = asyncHandler(async(req,res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline: [
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                               $first: "$owner" 
                            }
                        }
                    }
                ]
            }
        }
    ])
    if (!user.length) {
    throw new ApiError(404, "User not found");
}

    return res.status(200).json( new ApiResponse(200, user[0].watchHistory,"Watch History Fetched"));
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, 
    getCurrentUser, updateAccountDetails, updateUserAvatar,
     updateUserCoverImage, getUserChannelProfile, addToWatchHistory, getWatchHistory }