import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary,  extractPublicId,
  deleteFromCloudinary,}  from "../utils/cloudinary.js"
import {cacheManager} from "../redis/cache.utils.js"

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query
    //TODO: get all videos based on query, sort, pagination

     const isHomePageRequest =
    !query && !userId && Number(page) === 1 && Number(limit) === 10;
    const cacheKey = "videos:homepage:default";
    if (isHomePageRequest) {
        const cachedResult = await cacheManager.get(cacheKey);
        if (cachedResult) {
        console.log(
            "⚡ [Redis Cache Hit]: Serving default homepage video feed from memory"
        );
        return res.status(cachedResult.statusCode).json(cachedResult);
        }
        console.log(
        "🐢 [Redis Cache Miss]: Homepage cache empty. Processing MongoDB pipeline"
        );
    }

    const matchStage = {
        isPublished: true
    };

    if(query){
        matchStage.$or = [
            {
                title: {
                    $regex: query,
                    $options: "i"
                }
            },
            {
                description: {
                    $regex: query,
                    $options: "i"
                }
            }
        ];
    }

    if(userId){
        matchStage.owner = new mongoose.Types.ObjectId(userId)
    }

    const aggregate = Video.aggregate([
        {
            $match: matchStage
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
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
        },
        {
            $sort: {
                [sortBy]: sortType === "asc" ? 1: -1
            }
        }
    ]);

    const options = {
        page: Number(page),
        limit: Number(limit)
    };

    const videos = await Video.aggregatePaginate( aggregate, options);

    return res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    if(!title || !description){
        throw new ApiError(400, "Title and Description are required");
    }

    const videoLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if(!videoLocalPath){
        throw new ApiError(401, "Video file is required");
    }

    if(!thumbnailLocalPath){
        throw new ApiError(401, "Thumbnail is required");
    }

    const uploadVideo = await uploadOnCloudinary(videoLocalPath);
    // console.log("Uploaded Video Response:");
    // console.log(uploadVideo);

    // console.log(uploadVideo.resource_type);
    // console.log(uploadVideo.duration);


    if(!uploadVideo){
        throw new ApiError(500, "Failed to upload video");
    }
    
    const uploadThumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if(!uploadThumbnail){
        throw new ApiError(500, "Failed to upload thumbnail");
    }

    const video = await Video.create({
        videoFile: uploadVideo.secure_url,
        thumbnail: uploadThumbnail.secure_url,
        title,
        description,
        duration: uploadVideo.duration,
        owner: req.user._id
    });

    const createdVideo = await Video.findById(video._id);

    if(!createdVideo){
        throw new ApiError(500, "failed to publish video");
    }

    return res.status(201).json(new ApiResponse(201, createdVideo, "Video published successfully"))

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if(!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid Video ID")
    }

    const video = await Video.findById(videoId).populate("owner", "fullname username avatar")

    if(!video){
        throw new ApiError(404, "Video not found");
    }

    return res.status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const {title, description} = req.body
    //TODO: update video details like title, description, thumbnail

    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400, "Invalid Video ID")
    }

    const video = await Video.findById(videoId);

    if(!video){
        throw new ApiError(404, "Video not found");
    }

    if(video.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You are not authorised to update this video");
    }

    if(title){
        video.title = title;
    }
    if(description){
        video.description = description;
    }

    const thumbnailLocalPath = req.file?.path

    if(thumbnailLocalPath){
        const  uploadedThumbnail = await uploadOnCloudinary(thumbnailLocalPath)

        if(! uploadedThumbnail?.secure_url){
            throw new ApiError(500, "Failed to upload thumbnail")
        }

        video.thumbnail =  uploadedThumbnail.secure_url
    }
    if (uploadedThumbnail) {
        if (video.thumbnail) {
        const oldPublicId = extractPublicId(video.thumbnail);
        if (oldPublicId) {
            await deleteFromCloudinary(oldPublicId, "image");
            console.log("old thumbnail deleted successfully");
        }
        }
    }

    if (title) {
    video.title = title;
    }
    if (description) {
        video.description = description;
    }

    if (uploadedThumbnail) {
        video.thumbnail = uploadedThumbnail?.secure_url;
    }

    const updatedVideo = await video.save({ validateBeforeSave: false });

    if (!updatedVideo) {
        throw new ApiError(500, "video Update failed");
    }
    const cacheKey = `dashboard:videos:${req.user?._id}`;
    cacheManager.delete(cacheKey);

    return res.status(200)
    .json(new ApiResponse(200, video, "Video uploaded successfully"))
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400, "Invalid Video ID")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Video not found")
    }

    if(video.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403, "You are not authozised to delete this video")
    }

    const deletedVideo = await Video.findByIdAndDelete(videoId)

    if (!deletedVideo) {
        throw new ApiError(500, "video document deletion failed");
    } else {
        try {
        if (deletedVideo?.videoFile) {
            const videoPublicId = extractPublicId(deletedVideo?.videoFile);
            if (videoPublicId) {
            await deleteFromCloudinary(videoPublicId, "video");
            }
        }

        if (deletedVideo?.thumbnail) {
            const thumbnailPublicId = extractPublicId(deletedVideo?.thumbnail);
            if (thumbnailPublicId) {
            await deleteFromCloudinary(thumbnailPublicId, "image");
            }
        }
        } catch (error) {
        console.error(
            "CRITICAL: Video doc deleted from DB, but Cloudinary asset cleanup failed:",
            error
        );
        }
    }
    const cacheKey = `dashboard:videos:${req.user?._id}`;
    cacheManager.delete(cacheKey);
    return res
        .status(200)
        .json(
        new ApiResponse(
            200,
            deletedVideo,
            "Video and associated assets deleted successfully"
        )
        );
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400, "Invalid Video ID")
    }

    const video = await Video.findById(videoId)

    if(!video) {
        throw new ApiError(404, "Video not found")
    }

    if(video.owner.toString() !== req.user._id.toString()){
        throw new ApiError(404, "You are not authorised to modify this video")
    }

    video.isPublished = !video.isPublished;
    await video.save({validateBeforeSave: false})

    return res.status(200)
    .json(new ApiResponse(200, video, `Video ${
        video.isPublished ? "published" : "unpublished"
    } successfully`
));
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}