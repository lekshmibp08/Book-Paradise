const expressAsyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");


const User = require("../models/userModel");


//Render Login Page
const getLoginPage = async (req, res) => {
    try {
        res.render("adminLogin")
    } catch (error) {
        console.log(error.message);
    }
}


//Admin Login
const verifyLogin = expressAsyncHandler( async (req, res) => {
    const { email, password } = req.body
    console.log(email);

    const findAdmin = await User.findOne({email:email})
    console.log(findAdmin);
    if(findAdmin) {
        const paaswordMatch = await bcrypt.compare(password, findAdmin.password)
        if (paaswordMatch) {
            req.session.admin = true;
            console.log("Admin Logged In");
            res.redirect("/admin/dashboard")
        } else {
            console.log("Incorrect Password");
            res.render("adminLogin", { message : "Incorrect Email or Password"})
        }
    }
})


//Render Dashboard
const getDashboard = expressAsyncHandler( async(req, res) => {
    res.render("dashboard");
})


//Admin Log Out
const adminLogout = expressAsyncHandler( async(req, res) => {
    console.log("Admin logout");
    req.session.destroy()
    res.redirect("/admin/login")
})


module.exports = {
    getLoginPage,
    verifyLogin,
    getDashboard,
    adminLogout
}