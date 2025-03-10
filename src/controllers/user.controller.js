import asyncHandler from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend 
    const {fullname, email, username, password} =req.body
    // validation
    if (
        [fullname, email, username, password].some( (field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "fullname is required")
    }
    // check if user already exist : username , 
    const existesUser = User.findOne({
        $or : [{username},{email}]
    })
    if(existesUser){
        throw new ApiError(408, "User with email or username already exists")
    }
    // check for images || check for avatar
    const avatarLocatPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0].path;
    if(!avatarLocatPath){
        throw new ApiError(400, "Avatar file is required")
    }
    // upload the to cloudinary , avatar
        const avatar = await uploadOnCloudinary(avatarLocatPath)
        const coverImage = await uploadOnCloudinary(coverImageLocalPath)
        if(!avatar){
            throw new ApiError(400, "Avatar file is required")
        }
    // create user object - create entry in db
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })
// remove password and refresh token from response field.
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500, "Somthing went wrong while registering user")
    }
    // return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "user Register Successfully", )
    )
})

export {registerUser}