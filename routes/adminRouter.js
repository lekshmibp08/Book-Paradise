const express = require("express")
const router = express.Router()


const { uploadCategory, uploadProduct } = require('../helpers/multer');
const adminController = require("../controller/adminController")
const customerController = require("../controller/customerController")
const categoryController = require("../controller/categoryController")
const productController = require("../controller/productController")

const  {isAdmin} = require("../Athentication/auth")

//Admin Actions
router.get("/login", adminController.getLoginPage)
router.post("/login", adminController.verifyLogin)
router.get("/dashboard", isAdmin, adminController.getDashboard)
router.get("/logout", isAdmin, adminController.adminLogout)



// Customer Management
router.get("/users", isAdmin, customerController.getCustomerInfo)
router.get("/blockCustomer", isAdmin, customerController.getBlockCustomer)
router.get("/unblockCustomer", isAdmin, customerController.getUnblockCustomer)


// Category Management
router.get("/category", isAdmin, categoryController.getCategoryInfo)
router.post("/addCategory", isAdmin, uploadCategory.single('image'), categoryController.addCategory)
router.post("/blockCategory", isAdmin, categoryController.blockCategory)
router.post("/unBlockCategory", isAdmin, categoryController.unBlockCategory)


//Product Management
router.get("/products", isAdmin, productController.getAllProducts)
router.get("/addProducts", isAdmin, productController.getProductAddPage)
router.post("/addProducts", isAdmin, uploadProduct.array("productImage", 3), productController.addProducts)
router.get("/editProduct", isAdmin, productController.getEditProduct)
router.post("/editProduct/:id", isAdmin, uploadProduct.array("productImage", 5), productController.editProduct)
router.post("/blockProduct", isAdmin, productController.blockProduct)
router.post("/unBlockProduct", isAdmin, productController.unblockProduct)



module.exports = router;