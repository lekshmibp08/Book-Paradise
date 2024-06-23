const express = require("express")
const router = express.Router()

const { isLogged } = require("../Athentication/auth")

const userController = require("../controller/userController")
const userProfileController = require("../controller/userProfileController")
const wishlistController = require("../controller/wishlistController")
const cartController = require('../controller/cartController')
const orderController = require('../controller/orderController')

router.get("/pageNotFound", userController.pageNotFound)
router.get("/contact-us", userController.getContactUs)



// User actions
router.get("/", userController.getHomePage)
router.get("/login", userController.getLoginPage)
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




// Products based routes
router.get("/product", userController.getShopPage)
router.get("/productDetails", userController.getProductDetails)

//Profile page route
router.get("/profile", isLogged, userProfileController.getUserProfile)

//Add new Address page
router.get("/add-new-address", isLogged, userProfileController.getAddAddress)
router.post("/add-new-address", isLogged, userProfileController.AddAddress)

//Edit Address
router.get("/edit-address/:id", isLogged, userProfileController.getEditAddress)
router.post("/edit-address/:id", isLogged, userProfileController.editAddress)
router.post('/delete-address/:id', isLogged, userProfileController.deleteAddress);


//Edit Profile Details
router.get("/edit-profile", isLogged, userProfileController.editProfile)
router.post("/update-profile/:id", isLogged, userProfileController.updateProfile)
router.post("/change-password/:id", isLogged, userProfileController.changePassword)



// Wishlist
router.post("/add-to-wishlist", isLogged, wishlistController.addToWishlist)
router.get("/wishlist", isLogged, wishlistController.getWishlistPage)
router.get("/deleteWishlist", isLogged, wishlistController.deleteFromWishlist)


//Cart
router.get("/cart", isLogged, cartController.getCartPage)
router.post("/add-to-cart", cartController.addToCart)
router.delete("/deleteItem", isLogged, cartController.deleteCartProduct)
router.post("/update-quantity", isLogged, cartController.changeQuantity)
router.get("/coupons_list", isLogged, cartController.showCoupons)


//Order
router.post("/checkout", isLogged, orderController.getCheckoutPage)
router.post("/placeOrder", isLogged, orderController.placeOrder)
router.get("/view-order/:id", isLogged, orderController.getOrderDetails)
router.post("/cancel-order", isLogged, orderController.cancelOrder)



module.exports = router;