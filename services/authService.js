import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/userModel.js";
import Worker from "../models/workerModel.js";
import Facility from "../models/facilityModel.js";

// create a new worker account
const registerWorker = async (req, res) => {
  const {
    fullname,
    email,
    phoneNumber,
    password,
    profession,
    specialty,
    yearsOfExperience,
    location,
  } = req.body;

  // check for existing user
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new Error("Email already exists!");
  }

  // hash password
  const genSalt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, genSalt);

  // create user account
  const user = await User.create({
    email,
    phoneNumber,
    password: hashedPassword,
    role: "worker",
  });
  // create worker profile
  const worker = await Worker.create({
    user: user._id,
    fullName: fullname,
    profession,
    specialty,
    yearsOfExperience,
    location,
  });

  return { user, worker };
};

//Facility Registration
const registerFacility = async (req, res) => {
  const {
    facilityName,
    facilityType,
    taxID,
    businessEmail,
    adminName,
    phoneNumber,
  } = req.body;

  // check for existing user
  const existingUser = await User.findOne({ businessEmail });

  if (existingUser) {
    throw new Error("This business email already exists!");
  }

  // hash password
  const genSalt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, genSalt);

  // create user account
  const user = await User.create({
    email,
    phoneNumber,
    password: hashedPassword,
    role: "facility",
  });
  // create facility profile
  const facility = await Worker.create({
    user: user._id,
    fullName: fullname,
    profession,
    specialty,
    yearsOfExperience,
    location,
  });

  return { user, facility };
};

// worker login
const loginWorker = async (req, res) => {
  const { email, password } = req.body;

  //find user by email
  const user = await User.findOne({ email });
  const isPasswordValid = await bcrypt.compare(password, user.password); // encrypt and compare password

  // check if user exists and password is valid
  if (!user || !isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  // check verification status
  if (!user.isVerified) {
    throw new Error(
      "Your account is not verified. Please check your email for verification link.",
    );
  }

  // create token
  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
  );

  return {
const registerWorker = async (workerData) => {
    const {
        fullname,
        email,
        phoneNumber,
        password,
        profession,
        specialty,
        yearsOfExperience,
        location
    } = workerData;

    
    // check for existing user
    const existingUser = await User.findOne({ email })

    if(existingUser) {
        throw new Error("Email already exists!")
    }

    // hash password
    const genSalt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, genSalt)

    // create user account
    const user = await User.create({
        email,
        phoneNumber,
        password: hashedPassword,
        role: "worker"
    });

    // create worker profile
    const worker = await Worker.create({
        user: user._id,
        fullName: fullname,
        profession,
        specialty,
        yearsOfExperience,
        location
    });

    return { user, worker };

}

// worker login
const loginWorker = async (loginData)=> {
   const { email, password } = loginData;
   
   // find user by email
   const user = await User.findOne({ email });
   const isPasswordValid = await bcrypt.compare(password, user.password); // encrypt and compare password

   // check if user exists and password is valid
   if (!user || !isPasswordValid) {
    throw new Error("Invalid email or password");
   }

   // check account verification status
   if (!user.isVerified) {
    throw new Error("Your account is not verified. Please check your email for verification link.");
   }

   // create token for the logged in user
   const token = jwt.sign({
    id: user._id,
    role: user.role
   },
   process.env.JWT_SECRET, 
   {
    expiresIn: process.env.JWT_EXPIRES_IN
   });

   return { 
    token,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
  };
};

export { registerWorker, loginWorker, registerFacility };
