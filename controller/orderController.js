const mongodb = require('mongodb')
const User = require('../models/userModel')
const Address = require('../models/addressSchema')
const Product = require('../models/productModel')
const Coupon = require('../models/couponSchema')
const Cart = require('../models/cartSchema')
const Order = require('../models/orderSchema')
const razorpay = require('razorpay');
const ReturnOrder = require('../models/returnOrderSchema')
const Wallet = require('../models/walletSchema')
const Transaction = require('../models/transactionSchema')

let razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET

})


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
        let grandTotal = cart.totalPrice + 50 - cart.discount;
        const addresses = await Address.find({ userId: userId })
        const totalSave = cart.totalMRP - cart.totalPrice + cart.discount;
        
        res.render('checkout', { addresses, cart, products, grandTotal, totalSave })

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
       
        if (!paymentMethod || !billingAddress) {
            console.log('Payment method and billing address are required');
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
            couponDiscout: cartExist.discount,
            billingAddress: billingAddress,
            shippingAddress: billingAddress,
            paymentMethod: paymentMethod,
            status: 'Pending',
            returnStatus: 'Not Requested'
        });
        const grandTotal = totalAmount - cartExist.discount + 50

        if( paymentMethod === 'Razorpay') {
            
            await order.save();
            cartExist.items = [];
            cartExist.totalPrice = 0;
            cartExist.totalMRP = 0;
            cartExist.discount = 0;
            cartExist.couponApplied = null;
            await cartExist.save();
            await Coupon.updateOne({ _id: cartExist.couponApplied }, 
                { $addToSet: { usedBy: userId } });
            
                const options = {
                amount: grandTotal * 100,
                currency: 'INR',
                receipt : String(order._Id)
            };
            razorpayInstance.orders.create(options, function(err, razorpayOrder) {
                if (err) {
                    console.error(err);
                    console.log(razorpayOrder);
                    return res.status(500).json({success: false, message: 'Razorpay order creation failed', error: err });
                }
                console.log("RAZORPAY SUCCESS")
                res.json({ success: true, orderId: order._id, razorpayOrder });
            });
        } else if(paymentMethod === "Wallet") {
            console.log("Entered Wallet payment");
            const wallet = await Wallet.findOne({ userId })
            if(!wallet || wallet.balance < grandTotal){
                console.log("Insufficient wallet balance");
                return res.json({ success: false, message: 'Insufficient wallet balance'})
            }
            wallet.balance -= grandTotal;
            console.log('ORDER ID:', order.orderId);
            const transaction = new Transaction({
                userId: userId,
                amount: grandTotal,
                description: `Wallet Payment for Order Id: ${order.orderId}`,
                type: 'debit',
                status: 'completed'
            });

            await transaction.save();
            wallet.transactions.push(transaction._id);
            await wallet.save();
            await order.save();

            cartExist.items = [];
            cartExist.totalPrice = 0;
            cartExist.totalMRP = 0;
            cartExist.discount = 0;
            cartExist.couponApplied = null;
            await cartExist.save();

            return res.json({ success: true, message: 'Order placed successfully', orderId: order.orderId });
        } else {

            await order.save();
            cartExist.items = [];
            cartExist.totalPrice = 0;
            cartExist.totalMRP = 0;
            cartExist.discount = 0;
            cartExist.couponApplied = null;
            await cartExist.save();
            await Coupon.updateOne({ _id: cartExist.couponApplied }, 
                { $addToSet: { usedBy: userId } });

            console.log("Order placed successfully");
            //return res.status(200).json({ message: "Order placed successfully" });
            return res.json({ success: true, message: 'Order placed successfully', orderId: order.orderId });
        }
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message }); 
    }

}


//Get Order Details Page
const getOrderDetails = async( req, res ) =>{
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId)
        .populate('items.product')
        .populate('billingAddress');

        if (!order) {
            return res.status(400).render('error', { message: 'Order Details not Found' });
        }
        const grandTotal = order.totalAmount + 50
        res.render('order-details', { order, grandTotal })

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
            console.log("part1 working");
            return res.status(404).json({ flag: false, message: 'Order not found' });
        }
        if (['Pending', 'Processed', 'Shipped'].includes(orderData.status)) {
            orderData.status = 'Cancelled';
            await orderData.save();

    //Refund for Razorpay Payment
            if(orderData.paymentMethod === "Razorpay" || orderData.paymentMethod === "Wallet"){
                console.log("paymentMethod Working");
                const user = orderData.userId
                let wallet = await Wallet.findOne({ userId: user })
                console.log("WALLET FOUND:", wallet);
                
                if( !wallet ){
                    wallet = new Wallet({ userId: user, balance: 0, transactions: [] })
                }

                const description = `Refund, Order Id: ${orderData.orderId}`
                let refundAmount = orderData.totalAmount - orderData.couponDiscout;
                wallet.balance += refundAmount

                const transaction = new Transaction({
                    userId: user,
                    amount: refundAmount,
                    description: description,
                    type: "credit",
                    status: 'completed'
                });

                await transaction.save();
                console.log("WALLET TRANSACTIONS",wallet.transactions);
                wallet.transactions.push(transaction._id);
                await wallet.save();
                console.log("New WAllet:", wallet);

            }

            const items = orderData.items;
            for( const item of items){
                const { product, quantity } = item;
                console.log(`PRODUCT: ${product} & QUANTITY: ${quantity}`);
                await Product.findByIdAndUpdate(product, { $inc: { quantity: quantity } });
            }
            return res.status(200).json({ flag: true, message: 'Order cancelled successfully' });

        } else {
            return res.status(400).json({ flag: false, message:'Order cannot be cancelled' });
        }
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}

//Return products
const getReturnOrderForm = async( req, res ) =>{
    try {
        const orderId = req.params.id;
        const order = await Order.findById(orderId).populate('items.product');

        if (!order || order.status !== 'Delivered') {
            return res.status(404).send('Order not found or not eligible for return');
        }
        res.render('return-request-form', { order });
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Handle Return Order
const processReturnOrder = async( req, res ) =>{
    try {
        const orderId = req.params.id;
        const { returnReason } = req.body;

        const order = await Order.findById(orderId).populate('items.product');

        if (!order || order.status !== 'Delivered') {
            return res.status(404).send('Order not found or not eligible for return');
        }

        const returnOrder = new ReturnOrder({
            orderId,
            userId: req.session.user, 
            returnReason,
            status: 'Requested'
        });
        await returnOrder.save();

        order.status = 'Return Requested';
        order.returnStatus = 'Requested';
        await order.save();

        res.redirect('/profile?tab=orders');
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Cancel Return Request
const cancelReturnRequest = async( req, res ) =>{
    try {
        const orderId = req.params.id;

        await Order.findByIdAndUpdate(orderId, {
            status: 'Delivered',
            returnStatus: 'Canceled'
        });
        await ReturnOrder.findOneAndUpdate({ orderId }, {
            status: 'Canceled'
        });
        res.redirect('/profile?tab=orders');
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}



module.exports = {
    getCheckoutPage,
    placeOrder,
    getOrderDetails,
    cancelOrder,
    getReturnOrderForm,
    processReturnOrder,
    cancelReturnRequest 
}