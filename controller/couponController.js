const Coupon = require("../models/couponSchema")
const moment = require('moment')



//Render Coupon Page
const getAllCoupon = async(req, res) =>{
    try {
        const coupons = await Coupon.find({})
        const currentDate = new Date();
        res.render('coupon', {coupons, currentDate} )
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}



//Render Add Coupon Page
const getAddCoupon = async(req, res) =>{
    try {
        res.render("addCoupon")
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Add coupon Form submission
const addCoupon = async( req, res ) =>{
    try {
        const coupon = req.body;
        const couponExists = await Coupon.findOne({ name: coupon.couponName})

        if( !couponExists) {
            const newCoupon = new Coupon({
                name: coupon.couponName,
                code: coupon.couponCode,
                description: coupon.description,
                minAmount: coupon.minPurchaseAmount,
                maxDiscount: coupon.maxDiscount,
                discount: coupon.discount,                 
                expiryDate: moment(coupon.expiryDate).format('MMMM D, YYYY')
                
            })
            await newCoupon.save();
            res.redirect('/admin/coupons')
        } else {
            res.json('failed')
        }
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}

module.exports = {
    getAddCoupon,
    addCoupon,
    getAllCoupon
}