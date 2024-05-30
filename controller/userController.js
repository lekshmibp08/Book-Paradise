const nodemailer = require("nodemailer")
const bcrypt = require("bcrypt");
const expressAsyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const randomstring = require("randomstring");


const pageNotFound = async (req, res) => {
    try {
        res.render("404")
    } catch (error) {
        console.log(error.message);
    }
}

//Generate Hashed Password
const securePassword = expressAsyncHandler(async (password) => {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
})



//Load Home Page
const getHomePage = expressAsyncHandler( async (req, res) => {
    const user = req.session.user
    if (user) {
        res.render("home")
    } else {
        res.render("home")
    }
})


//Load signup page
const getSignupPage = async (req, res) => {
    try {
        if (!req.session.user) {
            res.render("signup")
        } else {
            res.redirect("/")
        }
    } catch (error) {
        console.log(error.message);
    }
};


//Loading the Login Page
const getLoginPage = async (req, res) => {
    try{
        if( !req.session.user ) {
            res.render("login")
        }
        else{
            res.render("/")
        }
    }
    catch(error){
        console.log(error.message);
    }
}


//Generate OTP
function generateOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp;
  }


//Email Verification
const verifyEmail = async (req, res) =>{
    try {
        const email = req.body.email
        const findUser = await User.findOne({ email : email })
        if(req.body.password === req.body.confirmPassword)
        {
            if( !findUser )
                {
                    const otp = generateOTP();
                    console.log(otp);;
                    const transporter = nodemailer.createTransport({
                        service: 'gmail',
                        host:'smtp.gmail.com',
                        port: 587,
                        secure:false,
                    
                        auth:{
                            user:'sreelekshmi310192@gmail.com',
                            pass: 'qmkmhxitpajtzcpo'
                        }
                    })
                    const mailOptions = {
                        from: 'sreelekshmi310192@gmail.com',
                        to: email,
                        subject: 'Verification Mail',
                        text: `Welcome to Books Paradise...! ${otp} is your OTP for Signup.`
                    }            
                    transporter.sendMail(mailOptions,(error)=>{
                        if(error){
                            console.log(error);
                        }else{
                            console.log('Email has been sent successfully');
                            req.session.userOtp = otp
                            req.session.userData = req.body
                            res.render("verify-otp")
                        }
                    })                        
                }
                else
                {
                    console.log("User already Exist");
                    res.render("signup", { message: "User with this email already exists" })
                }
            }
            else
            {
                console.log("Passwords are not matching");
                res.render("signup", { message: "Passwords are not matching" })
            }
        } catch (error) {
            console.log(error.message);      
        }
}


// render the OTP verification page

const getOtpPage = async (req, res) => {
    try {
        res.render("verify-otp")
    } catch (error) {
        console.log(error.message);
    }
}

// Resend Otp
const resendOTP = async (req, res) => {
    try {
        const email = req.session.userData.email;
        const otp = generateOTP();
        console.log(`Email : ${email} OTP : ${otp}`);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host:'smtp.gmail.com',
            port: 587,
            secure:false,
            
            auth:{
                user:'sreelekshmi310192@gmail.com',
                pass: 'qmkmhxitpajtzcpo'
            }
        })
        const mailOptions = {
            from: 'sreelekshmi310192@gmail.com',
            to: email,
            subject: 'Verification Mail - Resend OTP ✔',
            text: `Welcome to Books Paradise...! ${otp} is your OTP for Signup.`
        }            
        transporter.sendMail(mailOptions,(error)=>{
            if(error){
                console.log(error);
            }else{
                console.log('OTP resent successfully');
                req.session.userOtp = otp
                res.json({ status: true, message: 'OTP resent successfully' });
                //res.render("verify-otp")
            }
        })
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: 'Error in resending OTP' });
    }
}


//verify user OTP and save the user data to DB


const verifyOTP = async (req, res) => {
    try {
        const { otp } = req.body
        console.log('Received OTP:', otp);
        console.log('Session OTP:', req.session.userOtp);
        console.log(req.session.userData);
        if ( otp == req.session.userOtp) {
            const user = req.session.userData
            const passwordHash = await securePassword(user.password)

            const saveUserData = new User({
                name : user.name,
                email : user.email,
                mobile : user.mobile,
                password : passwordHash
            })

            await saveUserData.save()
        //Save user's _id in the session for future use
            req.session.user = saveUserData._id;
            res.json({ status : true })
        } else {
            console.log("OTP not Matching");
            res.json({ status : false })
        }
        
    } catch (error) {
        console.log(error.message);
    }

}

//Load Home Page for user
const userLogin = expressAsyncHandler( async (req, res) => {
    const { email, password } = req.body
    console.log("User in Home : ",req.body);

    const findUser = await User.findOne({ email: email, isAdmin:false })
    console.log("User in Home Found : ",findUser);
    
    if (findUser) {
        const isUserNotBlocked = findUser.isBlocked === false;
        if (isUserNotBlocked) {
            const passwordMatch = await bcrypt.compare(password, findUser.password)
            if (passwordMatch) {
                req.session.user = findUser._id
                console.log("Logged in");
                res.redirect("/")
            } else {
                console.log("Password is not matching");
                res.render("login", { message: "Password is not matching" })
            }
        } else {
            console.log("User is blocked by admin");
            res.render("login", { message: "User is blocked by admin" })
        }
    } else {
        console.log("User is not found");
        res.render("login", { message: "User not found" })
    }
})


//User log out
const getLogoutUser = expressAsyncHandler(async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err.message);
        }
        console.log("Logged out");
        res.redirect("/login")
    })
}) 

//Forget password Page Render
const getForgetPassword = expressAsyncHandler( async(req, res) => {
    res.render("forget")
})


//For rest password send mail
const sendResetPasswordMail = async (name, email, token) =>{
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        host:'smtp.gmail.com',
        port: 587,
        secure:false,
        requireTLS:true,
        auth:{
            user:'sreelekshmi310192@gmail.com',
            pass: 'qmkmhxitpajtzcpo'
        }
    })
    const mailOptions = {
        from: 'sreelekshmi310192@gmail.com',
        to: email,
        subject: 'Password Reset Mail',
        html: '<p>Hi '+name+', please click here to <a href="http://localhost:8000/reset-password?token='+token+'"> Resest</a> your Paradise Books Password '
    }            
    transporter.sendMail(mailOptions,(error)=>{
        if(error){
            console.log(error);
        }else{
            console.log('Email has been sent successfully');
        }
    })                        

}


//Send rest Link
const forgetVerify = expressAsyncHandler( async(req, res) => {
    const email = req.body.email;
    console.log(req.body.email);
    const userData = await User.findOne({ email : email, isAdmin:false});
    console.log(userData);
    if(userData) {
        const randomString = randomstring.generate();
        const updatedData = await User.updateOne({ email:email }, {$set : { token : randomString }}, { new: true })
        console.log(updatedData);
        const updatedUserData = await User.findOne({ email:email })
        console.log("updated User Data :", updatedUserData);
        sendResetPasswordMail(updatedUserData.name, updatedUserData.email, updatedUserData.token)
        res.render("forget", { message : "Check your Mail to Reset Password" })
    } else {
        res.render("forget", { message : "Incorrect Mail ID" })
    }

})

//Password reset router
const getResetPassword = expressAsyncHandler( async(req, res) => {
    const token = req.query.token;
    console.log(req.query.token);
    const tokenData = await User.findOne({ token:token })
    console.log(tokenData);
    if(tokenData) {
        res.render("reset-password", { user_id : tokenData._id })
    }
    else{
        res.render("404", { message:"Invalid Token" })
    }
})


//
const resetPassword = expressAsyncHandler( async(req, res) => {
    const password = req.body.password;
    console.log("New password : ", password);
    const user_id = req.body.user_id;
    const passwordHash = await securePassword(password);
    const updatedData = await User.findByIdAndUpdate({ _id: user_id }, { $set: { password : passwordHash, token : ""}})
    res.redirect("/login")
})



module.exports = { 
    getHomePage,
    getSignupPage,
    getLoginPage,
    verifyEmail,
    getOtpPage,
    verifyOTP,
    resendOTP,
    userLogin,
    getLogoutUser,
    getForgetPassword,
    forgetVerify,
    getResetPassword,
    resetPassword,
    pageNotFound    
};


//User Registration
/*const createUser = asyncHandler(async (req, res) => {
    const email = req.body.email;
    const findUser = await User.findOne({ email : email });
    if(!findUser){
        //create a new user
        const newUser = await User.create(req.body)
        res.json(newUser);
    }
    else{
        //User already exists
        throw new Error("User Already Exists");
    }
});*/