import asyncHandler from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"

// method for tokens

const generateAccessTokenAndRefereshToken = async (userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})
        return {refreshToken,accessToken}
    } catch (error) {
        throw new ApiError(500, "somthing went wrong while generating tokens")
    }
}

// register user
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
    const existesUser = await User.findOne({
        $or : [{username},{email}]
    })
    if(existesUser){
        throw new ApiError(408, "User with email or username already exists")
    }
    // check for images || check for avatar
    const avatarLocatPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0].path;
    if(!avatarLocatPath){
        throw new ApiError(400, "Avatar file is required")
    }
    // check coverimage optional
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.lenth > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
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

// login user
const loginUser = asyncHandler( async (req,res) => {
// recieve data from req.body
const { email,username, password } = req.body
if ( !(email || username)) {
    throw new ApiError(400, "username or email is required")
}
// username or email base
// find the user
const user = await User.findOne({
    $or:[{email},{username}]
})
if(!user){
    throw new ApiError(404, "user does not exists") 
}
// password check
const isPasswordValide = await user.isPasswordCrrect(password)
if(!isPasswordValide){
    throw new ApiError(401, "password is incorect") 
}
// aceess and refersh token
 const {refreshToken,accessToken} = await generateAccessTokenAndRefereshToken(user._id)
// send cookie
const logedInUser = await User.findOne(user._id).select("-password -refreshToken")
const options = {
    httpOnly : true,
    secure : true
}
return res.status(200)
.cookie("accessToken",accessToken. options)
.cookie("refreshToken", refreshToken, options)
.json(
    new ApiResponse(
        200,
        {
            user:logedInUser, accessToken, refreshToken
        },
        "user logged In successfully"
    )
)

})

const logoutUser = asyncHandler( async (req, rea) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {new : true }
    )
    const options = {
        httpOnly : true,
        secure : true
    }
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json( new ApiResponse(200, {}, "User logged out "))
})

const refreshAccessToken = asyncHandler( async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorize request")
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token")
        }
        if (incomingRefreshToken !== user.refreshToken) {
            throw new ApiError(401, "Refresh Token Expired or used")
        }
    
        const {newRefreshToken,accessToken} = await generateAccessTokenAndRefereshToken(user._id)
        
        const options = {
            httpOnly : true,
            secure : true
        }
        return res.status(200)
        .cookie("accessToken",accessToken. options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(new ApiResponse(200, {accessToken, newRefreshToken}, "Access Token Refresh"))
    } catch (error) {
        throw new ApiError(401, error?.message|| "invalid refresh token")
    }
})

export {registerUser, loginUser, logoutUser, refreshAccessToken}