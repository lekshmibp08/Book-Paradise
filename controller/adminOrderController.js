const Product = require('../models/productModel')
const Categry = require('../models/categoryModel')
const User = require('../models/userModel')
const Coupon = require('../models/couponSchema')
const Address = require('../models/addressSchema')
const Order = require('../models/orderSchema')
const { format } = require('date-fns')


//Render Order Page for Admin
const getOrderListPage = async( req, res ) =>{
    try {
        const PAGE_SIZE = 10; // Number of orders per page
        const currentPage = parseInt(req.query.page) || 1;
        const skip = (currentPage - 1) * PAGE_SIZE;

        const orders = await Order.find({})
            .populate('items.product')
            .populate('userId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(PAGE_SIZE)
            .lean();

        const totalOrders = await Order.countDocuments({});
        const totalPages = Math.ceil(totalOrders / PAGE_SIZE);


        res.render('orders', {
            orders,
            totalPages,
            currentPage,
            format 
        })

    } catch (error) {
        console.log('ERROR: ', error.message);
        res.status(400).render('error', { message: error.message });
    }
}

//Update the order status
const changeOrderStatus = async( req, res ) =>{
    try {
        const orderId = req.body.orderId;
        const status = req.body.status;
        
            await Order.updateOne({ _id: orderId}, { status })
            res.redirect('/admin/orders')
    } catch (error) {
        console.log('ERROR: ', error.message);
        res.status(400).render('error', { message: error.message });
    }
}

//Cancel Order by Admin
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
        console.log('ERROR: ', error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Render Order Details Page for Admin
const getOrderDetails = async( req, res ) =>{
    try {
        const orderId = req.query.id;
        const orderData = await Order.findById(orderId)
            .populate('userId')
            .populate('items.product')
            .populate('billingAddress')
            .populate('shippingAddress')
            .lean();
            
        res.render('order-detail', {
            orderData,
            format 
        })

    } catch (error) {
        console.log('ERROR: ', error.message);
        res.status(400).render('error', { message: error.message });
    }
}





module.exports = {
    getOrderListPage,
    changeOrderStatus,
    cancelOrder,
    getOrderDetails,
}