const Cart = require('../models/cartSchema')
const User = require('../models/userModel')
const Product = require('../models/productModel')
const Coupon = require('../models/couponSchema')
const mongodb = require("mongodb")
const moment = require('moment')


//Render Cart Page
const getCartPage = async( req, res) =>{
    try {
        const userId = req.session.user
        const cart = await Cart.findOne({ userId }).populate('items.product').exec();
        console.log(cart);
        const products = cart.items.map(item => ({
            ...item.product._doc,
            itemQuantity: item.itemQuantity,
            price: item.price,
        }));

        let grandTotal = cart.totalPrice + 50;
        res.render('cart', { cart, products, grandTotal });
        
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Add to Cart
const addToCart = async (req, res) => {
    try {
        console.log("Working");
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ status: "Please Login to add products to cart" });
        }
        const productId = req.query.id;
        const quantity = parseInt(req.query.quantity);
        console.log("Quantity: ", quantity);


        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ status: "Product not found" });
        }

        const cartExist = await Cart.findOne({ userId });

        if (cartExist) {
            const itemIndex = cartExist.items.findIndex(item => item.product.toString() === product._id.toString());

            if (itemIndex > -1) {
                if (quantity === 0) {
                    // Remove the product from the cart
                    cartExist.items.splice(itemIndex, 1);
                    cartExist.totalPrice = cartExist.items.reduce((acc, item) => acc + (item.price * item.itemQuantity), 0);
                    await cartExist.save();
                    return res.status(200).json({ status: "Product Removed from the Cart" });
                } else {
                    if (quantity > product.quantity) {
                        return res.status(400).json({ status: "Out of Stock" });
                    } else if (quantity <= 5) {
                        // Update the quantity of the existing product in the cart
                        cartExist.items[itemIndex].itemQuantity = quantity;
                        cartExist.items[itemIndex].price = product.salePrice;
                        cartExist.totalPrice = cartExist.items.reduce((acc, item) => acc + (item.price * item.itemQuantity), 0);
                        await cartExist.save();
                        return res.status(200).json({ status: "Product Cart Updated" });
                    } else {
                        return res.status(400).json({ status: "Max quantity per product is 5" });
                    }
                }
            } else {
                if (quantity === 0) {
                    return res.status(400).json({ status: "Invalid Quantity" });
                } else if (quantity <= product.quantity) {
                    if (quantity <= 5) {
                        // Add the new product to the cart
                        cartExist.items.push({
                            product: productId,
                            name: product.productName,
                            price: product.salePrice,
                            itemQuantity: quantity
                        });
                        cartExist.totalPrice = cartExist.items.reduce((acc, item) => acc + (item.price * item.itemQuantity), 0);
                        await cartExist.save();
                        return res.status(200).json({ status: "Product Added to Cart" });
                    } else {
                        return res.status(400).json({ status: "Max quantity per product is 5" });
                    }
                } else {
                    return res.status(400).json({ status: "Out of Stock" });
                }
            }
        } else {
            if (quantity === 0) {
                console.log("no Cart Stage 1");
                return res.status(400).json({ status: "Invalid Quantity" });
            } else if (quantity <= product.quantity) {
                console.log("no Cart Stage 2");
                if (quantity <= 5) {
                    console.log("no Cart Stage 3");
                    // Create a new cart
                    const newCart = new Cart({
                        userId: userId,
                        items: [{
                            product: productId,
                            name: product.productName,
                            price: product.salePrice,
                            itemQuantity: quantity
                        }],
                        totalPrice: product.salePrice * quantity,
                        createdOn: Date.now()
                    });
                    await newCart.save();
                    console.log("no Cart Stage 4");
                    return res.status(200).json({ status: "Product Added to Cart" });
                } else {
                    console.log("no Cart Stage 5");
                    return res.status(400).json({ status: "Max quantity per product is 5" });
                }
            } else {
                console.log("no Cart Stage 6");
                return res.status(400).json({ status: "Out of Stock" });
            }
        }
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
};


// Update the Cart Quantity
const changeQuantity = async (req, res) => {
    try {
        console.log("working");
        const userId = req.session.user;
        const productId = req.body.productId;
        const newQuantity = parseInt(req.body.newQuantity);

        const product = await Product.findById(productId);
        const stock = product.quantity;

        if(newQuantity >= 1 && newQuantity <= stock && newQuantity < 6){
            const cart = await Cart.findOne({ userId });
            const productIndex = cart.items.findIndex(item => item.product == productId);

            if (productIndex === -1) {
                return res.status(404).json({ error: "Product not found in cart" });
            } else {
                cart.items[productIndex].itemQuantity = newQuantity;
                cart.totalPrice = cart.items.reduce((acc, item) => acc + (item.price * item.itemQuantity), 0);
                await cart.save();
            }

            const subTotal = cart.totalPrice;
            const shipping = 50;
            const grandTotal = subTotal + shipping;
            res.status(200).json({ subTotal, grandTotal });
        } else {
            res.status(400).json({ error: "Invalid Quantity" });
        }
    } catch (error) {
        console.log(error.message);
        res.status(400).json({ error: error.message });
    }
}


//Delete Product From Cart
const deleteCartProduct = async( req, res) =>{
    try {
        console.log("Working");
        const id = req.query.id;
        console.log("Product ID : ", id);
        const userId = req.session.user;
        const user = await User.findById(userId)
        const cartExist = await Cart.findOne({userId})
        if ( !cartExist ){
            return res.status(400).json({ message: "Empty cart"})
        }
        const itemIndex = cartExist.items.findIndex(item => item.product.toString() === id.toString());
        if (itemIndex === -1) {
            return res.status(400).json({ message: "Product not Found" })
        }
        
        cartExist.items.splice(itemIndex, 1);
        cartExist.totalPrice = cartExist.items.reduce((acc, item) => acc + (item.price * item.itemQuantity), 0);
        
        await cartExist.save();
        console.log("Item deleted from cart");
        return res.status(200).json({ message: "Product Removed from the Cart" });
        
    } catch (error) {
        console.log("Error Message : ", error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Show all Coupon List on Cart Page
const showCoupons = async( req, res ) =>{
    try {
        //let subTotal = req.body.subTotal
        const today = new Date()
        const coupons = await Coupon.find({ 
            status: true,
            createdDate: { $lt: new Date(today) },
            expiryDate: { $gt: new Date(today) },
        })
        const couponData = coupons.map( coupon => ({
            ...coupon._doc,
            expiryDate: moment(coupon._doc.expiryDate).format('MMMM D, YYYY')
        }))
        /*coupons.map(coupon =>{
            console.log("Data : ", coupon.name);

        })*/
       console.log(couponData);
       //console.log("subtotal :", subTotal);
        res.json(couponData)
    } catch (error) {
        console.log("Error Message : ", error.message);
        res.status(400).render('error', { message: error.message });
    }
}


module.exports = {
    getCartPage,
    addToCart,
    changeQuantity,
    deleteCartProduct,
    showCoupons
}