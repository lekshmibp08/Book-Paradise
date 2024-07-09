const ReturnOrder = require('../models/returnOrderSchema')
const Order = require('../models/orderSchema')
const Wallet = require('../models/walletSchema')
const Transaction = require('../models/transactionSchema')
const { format } = require('date-fns')


const getReturnOrders = async( req, res ) =>{
    try {
        const returnOrders = await ReturnOrder.find()
            .populate('orderId')
            .populate('userId')
            .sort({ createdAt: -1})


            console.log(returnOrders);

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
                path: 'items.product'
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
                status: status === 'Approved' ? 'Request Processed' : 'Delivered', 
                returnStatus: status
            });
        } else if (status === 'Returned'){                      //Refund for completed Return

            await Order.findByIdAndUpdate(updatedReturnOrder.orderId, {
                status: status,
                returnStatus: status
            })

            let returnOrder = await ReturnOrder.findById(returnOrderId)
                .populate('userId')
                .populate('orderId');
            
            let refundAmount = returnOrder.orderId.totalAmount - returnOrder.orderId.couponDiscout;
            let description = `Refund, Order Id: ${returnOrder.orderId.orderId}` 

            console.log(refundAmount);
            const transaction = new Transaction({
                userId: returnOrder.userId._id,
                amount: refundAmount,
                description: description,
                type: 'credit',
                status: 'completed'
            })
            await transaction.save();
            console.log(transaction);

            let wallet = await Wallet.findOne({userId: returnOrder.userId._id});
            
            if( !wallet ) {
                wallet = new Wallet({
                    userId: returnOrder.userId._id,
                    balance: 0,
                    transactions: []
                })
            }
            wallet.balance += refundAmount;
            wallet.transactions.push(transaction._id);
            await wallet.save();
            console.log(wallet);
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