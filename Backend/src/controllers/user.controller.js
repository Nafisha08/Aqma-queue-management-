import { asyncHandler } from "../middlewares/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
// import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    //get user details from frontend
    //validation-not empty
    //check if user already exist :username, email
    //check for images, check for avtar
    //upload them to cloudinary ,avtar
    //create user object-creadte entry in db
    //remove password and refresh token field from 
    //check for user creation 
    //return res

    const { fullName, email, username, password } = req.body
    console.log("email:", email);

    if (
        [fullName, email, username, password].some((field) =>
            field?.trim() === "")

    ) {
        throw new ApiError(400, "All field are required")
    }
    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    const avatarLocalPath = req.files?.avtar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }
    const avtart = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!avatar) {
        throw new ApiError(400, "avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "somthing went wrong while registring the user")
    }
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registerd successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    const { username, password } = req.body

    if (!username || !password) {
        throw new ApiError(400, "Username and password are required")
    }

    // Convert username to lowercase for case-insensitive matching
    const normalizedUsername = username.toLowerCase()

    const user = await User.findOne({ username: normalizedUsername })
    if (!user) {
        throw new ApiError(401, "Invalid credentials")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid credentials")
    }

    const token = user.generateAccessToken()

    const loggedInUser = await User.findById(user._id).select("-password")

    console.log('Login successful - Username:', normalizedUsername, 'Role:', user.role)

    return res.status(200).json(
        new ApiResponse(200, {
            user: loggedInUser,
            token
        }, "Login successful")
    )
})

export { registerUser, loginUser }
