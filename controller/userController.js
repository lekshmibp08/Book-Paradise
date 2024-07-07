const nodemailer = require("nodemailer")
const bcrypt = require("bcrypt");
const expressAsyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const Product = require("../models/productModel")
const Category = require("../models/categoryModel")
const Wallet = require('../models/walletSchema')
const Transaction = require('../models/transactionSchema')
const Cart = require('../models/cartSchema')
const randomstring = require("randomstring");


const pageNotFound = async (req, res) => {
    try {
        res.render("error", {
            message: "Page not found"
        })
    } catch (error) {
        console.log(error.message);
    }
}

const getContactUs = async(req, res) =>{
    try {
        res.render('contact')
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Generate Hashed Password
const securePassword = expressAsyncHandler(async (password) => {
        const passwordHash = await bcrypt.hash(password, 10)
        return passwordHash
})



//Load Home Page
const getHomePage = async(req, res) => {
    try {
        const userId = req.session.user
        const user = await User.findById(userId)
        const productData = await Product.find({ isBlocked: false })
        const cart = await Cart.findOne({userId: userId})

        console.log(userId);
        console.log(cart);
        
        res.render("home", { user, productData, cart })
        
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Load signup page
const getSignupPage = async (req, res) => {
    try {
        if (!req.session.user) {
            const message = req.query.message || '';
            res.render("signup", { message });
        } else {
            res.redirect("/")
        }
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
};


//Loading the Login Page
const getLoginPage = async (req, res) => {
    try{
        if( !req.session.user ) {
            const message = req.query.message;
            res.render("login", { message });
        }
        else{
            console.log("test");
            res.redirect("/")
        }
    }
    catch(error){
        res.redirect("/login");
        console.log(error.message);
    }
}


//Generate OTP
function generateOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000);
    return otp;
  }

// Generate a unique referral code
function generateReferralCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
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
            res.status(400).render('error', { message: error.message });      
        }
}


// render the OTP verification page

const getOtpPage = async (req, res) => {
    try {
        res.render("verify-otp")
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
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
        res.status(400).render('error', { message: 'Error in resending OTP' });
    }
}


//verify user OTP and save the user data to DB


const verifyOTP = async (req, res) => {
    try {
        const { otp } = req.body
        //console.log('Received OTP:', otp);
        //console.log('Session OTP:', req.session.userOtp);
        console.log(req.session.userData);
        if ( otp == req.session.userOtp) {
            const referralCode = generateReferralCode();
            console.log(referralCode);
            const user = req.session.userData
            const passwordHash = await securePassword(user.password)

            const newUser = new User({
                name : user.name,
                email : user.email,
                mobile : user.mobile,
                password : passwordHash,
                referralCode : referralCode
            })

            await newUser.save()
            console.log(newUser);

            const newUserWallet = new Wallet({
                userId: newUser._id,
                balance: 0
            });

            //Validate Referral Code
            if ( user.referralCode ) {

                const referringUser = await User.findOne({
                    referralCode: user.referralCode
                })
                if (referringUser) {
                    let referringUserWallet = await Wallet.findOne({
                        userId: referringUser
                    })
                    
                    if( !referringUserWallet) {
                        referringUserWallet = new Wallet({
                            userId: referringUser._id,
                            balance: 0
                        })
                    }
                    console.log("Reffering Wallet;", referringUserWallet);
                    newUserWallet.balance += 50;
                    referringUserWallet.balance += 250;
                    
                    await newUserWallet.save();
                    await referringUserWallet.save();
                    console.log("Reffering Wallet;", referringUserWallet);

                    const newUserTransaction = new Transaction({
                        userId: newUser._id,
                        amount: 50,
                        description: 'Referral bonus',
                        type: 'credit'
                    })

                    const referringUserTransaction = new Transaction({
                        userId: referringUser._id,
                        amount: 250,
                        description: 'Referral reward',
                        type: 'credit'
                    })

                    newUser.isUsedReferral = true;
                    referringUser.redeemedUsers.push(newUser._id);

                    await newUser.save()
                    await referringUser.save()
                    await newUserTransaction.save();
                    await referringUserTransaction.save();
                    
                } else {
                    console.log('Invalid Referral Code');
                    await User.findByIdAndDelete(newUser._id);
                    return res.json({status: false, message: "Invalid Referral Code" });
                }

            } 
                
            await newUserWallet.save();


        //Save user's _id in the session for future use
            req.session.user = newUser._id;
            return res.json({ status : true })
        } else {
            console.log("OTP not Matching");
            res.json({ status : false, message: "OTP not Matching" })
        }
        
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
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
const getLogoutUser = async (req, res) => {
    try {
        req.session.destroy((err) => {
        if (err) {
            console.log(err.message);
        }
        console.log("Logged out");
        res.redirect("/login")
        })
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}

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


//Password Resetting
const resetPassword = expressAsyncHandler( async(req, res) => {
    const password = req.body.password;
    console.log("New password : ", password);
    const user_id = req.body.user_id;
    const passwordHash = await securePassword(password);
    const updatedData = await User.findByIdAndUpdate({ _id: user_id }, { $set: { password : passwordHash, token : ""}})
    res.redirect("/login")
})


//Shopping page for user
//Shopping page for user
const getShopPage = async (req, res) => {
    try {
        const userId = req.session.user;
        let sortOption = req.query.sort || ''; 
        const searchQuery = req.query.search || '';
        const categoryFilters = req.query.categories ? req.query.categories.split(',') : [];
        const languageFilters = req.query.languages ? req.query.languages.split(',') : [];

        console.log("SORT: ", sortOption);
        console.log("SEARCH: ", searchQuery);

// Search and Filter Products
        const searchCondition = {
            productName: { $regex: searchQuery, $options: 'i' },
            isBlocked: false,
        };
        if (categoryFilters.length > 0) {
            searchCondition.category = { $in: categoryFilters };
        }
        if (languageFilters.length > 0) {
            searchCondition.language = { $in: languageFilters };
        }

        const count = await Product.find(searchCondition).count();
        const categories = await Category.find({ isListed: true });
        const userData = await User.findById(userId, { isBlocked: false });

//Sorting Conditions
        let sortCondition;
        switch (sortOption) {
            case 'price_high':
                sortCondition = { salePrice: -1 };
                break;
            case 'price_low':
                sortCondition = { salePrice: 1 };
                break;
            case 'name_asc':
                sortCondition = { productName: 1 }; 
                break;
            case 'name_desc':
                sortCondition = { productName: -1 };
                break;
            default:
                sortCondition = {};
        }

//Filter based on language        
        const languageSet = await Product.aggregate([
            { $match: { isBlocked: false }},
            { $group: { _id: '$language'}},
            { $project: { _id: 0, language: '$_id' }}
        ])
        const languages = languageSet.map((item) => item.language);

//Pagination
        let page = 1;
        if (req.query.page) {
            page = req.query.page;
        }
        let itemsPerPage = 6;


        const products = await Product.find(searchCondition)
            .sort(sortCondition)
            .limit(itemsPerPage * 1)
            .skip((page - 1) * itemsPerPage)
            .exec();

        let totalPages = Math.ceil(count / itemsPerPage);

        res.render("shop", {
            products: products,
            categories,
            count: count,
            currentPage: page,
            totalPages,
            searchQuery,
            sortOption,
            userData,
            languages,
            categoryFilters,
            languageFilters
        });
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}



//Product Details Page
const getProductDetails = async (req, res) => {
    try {
        const user = req.session.user
        console.log("user :", user);
        const id = req.query.id
        console.log("Query Id :", id);
        const findProduct = await Product.findOne({ id: id });
        const findCategory = await Category.findOne({name : findProduct.category})
        // console.log(findCategory);
       
        console.log(findProduct.id, "Hello world");
        if (user) {
            res.render("product-details", { data: findProduct, user: user })
        } else {
            res.render("product-details", { data: findProduct })
        }
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}



module.exports = { 
    pageNotFound,
    getContactUs,
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
    getShopPage,
    getProductDetails,
    securePassword    
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