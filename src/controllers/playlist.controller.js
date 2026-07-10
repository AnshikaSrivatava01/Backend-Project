import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlists.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    //TODO: create playlist
    if(!name || name.trim() === ""){
        throw new ApiError(404, "Playlist name is required")
    }
    
    const playlist = await Playlist.create({
        name: name.trim(),
        description: description?.trim() || "",
        owner: req.user._id
    });

    if(!playlist){
        throw new ApiError(500, "Failed to create playlist")
    }

    return res.status(200)
    .json(new ApiResponse(200, playlist, "Playlist created Successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists

    if(!mongoose.Types.ObjectId.isValid(userId)){
        throw new ApiError(400, "Invalid user id")
    }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup:{
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
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                videos: 1,
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
   

    return res.status(200)
    .json(new ApiResponse(200, playlists, "User playlists fetched successfully"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    
    if(!mongoose.Types.ObjectId.isValid(playlistId)){
        throw new ApiError(400, "Invalid playlist id")
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
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
            $unwind:"$owner"
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1, 

                owner :{
                    _id: "$owner._id",
                    fullname: "$owner.fullname",
                    username: "$owner.username",
                    avatar: "$owner.avatar",
                },

                videos: {
                    $map: {
                        input: "$videos",
                        as:"video",
                        in: {
                            _id: "$$video._id",
                            title:"$$video.title",
                            duration:"$$video.duration",
                            thumbnail:"$$video.thumbnail",
                            views:"$$video.views",
                            isPushished:"$$video.isPublished",
                        }
                    }
                }
            }
        }
    ]);

    if(!playlist.length){
        throw new ApiError(404, "Playlist not found")
    }

    return res.status(200)
    .json(new ApiResponse(200, playlist[0], "Playlist fetched successfully"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!mongoose.Types.ObjectId.isValid(playlistId) ||
        !mongoose.Types.ObjectId.isValid(videoId)) {
            throw new ApiError(400, "Invalid Playlist ID or Video ID")
    }

    const playlist = await Playlist.findById(playlistId)

    if(!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    if(playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(400, "You are not authorised to modify this playlist");
    }

    const video = await Video.findById(videoId)

    if(!video) {
        throw new ApiError(404, "Video not found")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId, {
            $addToSet: {
                videos: videoId
            }
        },
        {
            new: true
        }
    ).populate("owner", "fullname username avatar")
     .populate("videos","title thumbnail duration views")
    
    return res.status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Videos added to playlist successfully")) 

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

    if(!mongoose.Types.ObjectId.isValid(playlistId) ||
    !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid Playlist ID or Video ID")
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if(playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to modify this playlist");
    }

    const updatePlaylist = await Playlist.findByIdAndUpdate(
        playlistId, {
            $pull: {
                videos: videoId
            }
        },
        {
            new: true
        }
    ).populate("owner", "fullname username avatar")
    .populate("videos","title thumbnail duration views")

    return res.status(200)
    .json(new ApiResponse(200, updatePlaylist[0], "Video removed successfully"))

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist

    if(!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    if(playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to delete this playlist");
    }

    await Playlist.findByIdAndDelete(playlistId)

    return res.status(200)
    .json(new ApiResponse(200, {}, "Playlist Deleted successfully"))

})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    if(!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID")
    }

    if(!name && !description) {
        throw new ApiError(400, "Name and description is required")
    }

    const playlist = await Playlist.findById(playlistId);

    if(!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    if(playlist.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not authorized to update this playlist");
    }

    const updateFields = {}

    if(name) {
        updateFields.name = name.trim();
    }

    if(description) {
        updateFields.description = description.trim()
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId, {
            $set: updateFields
        },
        {
            new: true,
            runValidators: true
        }
    );

    return res.status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Playlist updated successfully"))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}