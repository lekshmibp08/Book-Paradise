const mongodb = require('mongodb')
const User = require('../models/userModel')
const Address = require('../models/addressSchema')
const Product = require('../models/productModel')
const Coupon = require('../models/couponSchema')
const Cart = require('../models/cartSchema')
const Order = require('../models/orderSchema')


const getCheckoutPage = async( req, res ) =>{
    try {
        const userId = req.session.user;
        console.log("Checkout User: ", userId);
        const cart = await Cart.findOne({ userId }).populate('items.product').exec();
        console.log(cart);
        const products = cart.items.map(item => ({
            ...item.product._doc,
            itemQuantity: item.itemQuantity,
            price: item.price,
        }));
        let grandTotal = cart.totalPrice + 50;
        const addresses = await Address.find({ userId: userId })
        
        res.render('checkout', { addresses, cart, products, grandTotal })

    } catch (error) {
       console.log(error.message);
       res.status(400).render('error', { message: error.message }); 
    }
}


//Place Order Logic
const placeOrder = async( req, res ) =>{
    try {
        const userId = req.session.user;
        if( !userId ){
            return res.status(401).json({ message: 'User not logged in' });
        }
        const cartExist = await Cart.findOne({ userId }).populate('items.product');    
        if( !cartExist ){
            return res.status(400).json({ message: 'Cart Not Found' });
        }
        if( cartExist.items.length === 0 ) {
            return res.status(400).json({ message: 'Cart is Empty' });
        }
        const { paymentMethod, billingAddress } = req.body;
        console.log("BILLING ADDRESS: ", billingAddress);
        console.log(paymentMethod);
        if (!paymentMethod || !billingAddress) {
            return res.status(400).json({ message: 'Payment method and billing address are required' });
        }
        const orderItems = cartExist.items.map(item => ({
            product: item.product._id,
            quantity: item.itemQuantity,
            total: item.price * item.itemQuantity
        }));

        const totalAmount = orderItems.reduce((sum, item) => sum + item.total, 0);
        const orderId = Date.now().toString() + Math.floor(Math.random() * 1000);

        const order = new Order({
            orderId: orderId,
            userId: cartExist.userId,
            items: orderItems,
            totalAmount,
            billingAddress: billingAddress,
            shippingAddress: billingAddress,
            paymentMethod: paymentMethod,
            status: 'Pending',
            returnStatus: 'Not Requested'
        });

        await order.save();
        console.log("NEW ORDER: ", order);
        
        const orderExist = await Order.findOne({ orderId });
        if ( !orderExist ) {
            return res.status(400).json({ message: 'Order Failed. Try Again...' });
        }

        cartExist.items = [];
        cartExist.totalPrice = 0;
        await cartExist.save();

        console.log("Order placed successfully");
        return res.status(200).json({ message: "Order placed successfully" });

    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message }); 
    }

}


//Get Order Details Page
const getOrderDetails = async( req, res ) =>{
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId).populate('items.product');
        if (!order) {
            return res.status(400).render('error', { message: 'Order Details not Found' });
        }
        res.render('order-details', { order })

    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}

//Order Cancell Logic
const cancelOrder = async( req, res ) =>{
    try {
        const orderId = req.query.id;
        const orderData = await Order.findById(orderId);

        if (!orderData) {
            return res.status(404).json({ error: 'Order not found' });
        }
        if (orderData.status === 'Pending') {
            orderData.status = 'Cancelled';
            await orderData.save();

            const items = orderData.items;
            for( const item of items){
                const { product, quantity } = item;
                await Product.findByIdAndUpdate(product, { $inc: { quantity: quantity } });
            }
            return res.status(200).json({ message: 'Order cancelled successfully' });

        } else {
            return res.status(400).json({ error: 'Order cannot be cancelled' });
        }
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}



module.exports = {
    getCheckoutPage,
    placeOrder,
    getOrderDetails,
    cancelOrder 
}