const express = require("express")
const router = express.Router()

const { isLogged } = require("../Athentication/auth")

const userController = require("../controller/userController")

router.get("/pageNotFound", userController.pageNotFound)



// User actions
router.get("/", userController.getHomePage)
router.post("/login", userController.userLogin)
router.get("/signup", userController.getSignupPage)
router.post("/signup", userController.verifyEmail)
router.get("/verify-otp", userController.getOtpPage)
router.post("/verify-otp", userController.verifyOTP)
router.post("/resend-otp", userController.resendOTP)
router.get("/logout",isLogged, userController.getLogoutUser)
router.get("/forget", userController.getForgetPassword)
router.post("/forget", userController.forgetVerify)
router.get("/reset-password", userController.getResetPassword)
router.post("/reset-password", userController.resetPassword)





router.get("/login", userController.getLoginPage)
//router.post("/login", userController.userLogin)




module.exports = router;