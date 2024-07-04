const ReturnOrder = require('../models/returnOrderSchema')
const Order = require('../models/orderSchema')
const { format } = require('date-fns')


const getReturnOrders = async( req, res ) =>{
    try {
        const returnOrders = await ReturnOrder.find()
            .populate('orderId')
            .populate('userId')
            .sort({ createdAt: -1})

        res.render('returnOrders', { returnOrders, format })
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


const viewReturnOrderDetails = async( req, res ) => {
    try {
        const returnOrderId = req.params.id;
        const returnOrder = await ReturnOrder.findById(returnOrderId)
        .populate({
            path: 'orderId',
            populate: {
                path: 'items.product',
                select: 'productImage'
            }
        })
            .populate('userId')
            .lean();

        if (!returnOrder) {
            return res.status(404).send('Return order not found');
        }
        returnOrder.orderId.items.forEach(function(item) {
            console.log(`item: ${item}`);
        })
        
        res.render('viewReturnOrder', { returnOrder, format })
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message }); 
    }
}


const updateReturnOrderStatus = async( req, res ) => {
    try {
        const returnOrderId = req.params.id;
        const { status } = req.body;

        const updatedReturnOrder = await ReturnOrder.findByIdAndUpdate(returnOrderId, {
            status: status,
            updatedAt: new Date()
        }, { new: true });

        if (status === 'Approved' || status === 'Rejected' || status === 'Canceled') {
            await Order.findByIdAndUpdate(updatedReturnOrder.orderId, {
                status: status === 'Approved' ? 'Returned' : 'Delivered', 
                returnStatus: status
            });
        }
        res.json({ status: true, message: 'Status Updated Successfully..!' });
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message }); 
    }
}


module.exports = {
    getReturnOrders,
    viewReturnOrderDetails,
    updateReturnOrderStatus
}