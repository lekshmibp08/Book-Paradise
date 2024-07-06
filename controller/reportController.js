const Order = require('../models/orderSchema')
const Product = require('../models/productModel')
const User = require('../models/userModel')
const fs = require('fs')
const path = require('path')
const PDFDocument = require("../helpers/pdfkit-tables");



const getSalesReport = async( req, res ) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;

        const skip = (page - 1 ) * limit;

        const orders = await Order.find({})
        .sort({ createdAt: -1})
        .populate('userId')
        .populate('items.product')
        .skip(skip)
        .limit(limit);

        const totalOrders = await Order.countDocuments({});
        const totalPages = Math.ceil(totalOrders/limit);

        res.render('reports', {
            orders,
            currentPage: page,
            totalPages,
            limit
        })
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}

const generateReport = async( req, res ) => {
    try {
        const filename = 'sales-report.pdf';
        const doc = new PDFDocument();

        const filePath = path.join(__dirname, filename);
        let ordersGroup;

        // Aggregation pipeline based on the date filter
        if (req.body.datefilter === 'daily') {
            ordersGroup = await Order.aggregate([
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        orders: { $push: "$$ROOT" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
                
            ]);
        } else if (req.body.datefilter === 'weekly') {
            ordersGroup = await Order.aggregate([
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            week: { $week: "$createdAt" }
                        },
                        orders: { $push: "$$ROOT" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id.year": 1, "_id.week": 1 } }
                
            ]);
        } else if (req.body.datefilter === 'monthly') {
            ordersGroup = await Order.aggregate([
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" }
                        },
                        orders: { $push: "$$ROOT" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } }
                
            ]);
        } else if (req.body.datefilter === 'custom') {
            const customDateOrders = await Order.find({
                createdAt: {
                    $gte: new Date(req.body.startdate),
                    $lte: new Date(req.body.enddate)
                }
            }).populate('userId').exec();

            ordersGroup = [{
                _id: `${req.body.startdate}-${req.body.enddate}`,
                orders: customDateOrders
            }];
        }
        console.log(ordersGroup);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
        doc.pipe(res);

        const imagePath = path.join(
            __dirname,
            "..",
            "public",
            "adminAssets",
            "assets",
            "images",
            "main-logo.png"
        );
        doc
        .image(imagePath, 50, 45, { width: 150 })
        .fillColor("#444444")
        .fontSize(20)
        .text("Sales Report", 10, 57,{ align:'center' })
        .fontSize(10)
        .text(`created At:${new Date().toDateString()}`, 200, 65, { align: "right" })
        .moveDown(5);

        for (const data of ordersGroup) {
            doc
            .fillColor("#444444")
            .fontSize(14)
            .text(`Ordered-at ${data._id}`, 50,  doc.y,{ align:'center' })
            .moveDown(1);
    
          const table = {
            headers: [
              "Order id",
              "Order date",
              "User name",
              "Total Price",
              "Discount",
              "Total Paid",
              "Payment Method",
              "Order status",
            ],
            rows: [],
          };
          let totalSales = 0;
          let totalDiscount = 0;
          let totalRevenue = 0;
        
          // Add the patients to the table
          for (const item of data.orders) {
            table.rows.push([
                item.orderId,
                new Date(item.createdAt).toLocaleString(),
                item.userid?.name,
                item.totalAmount,
                item.couponDiscout,
                item.totalAmount - item.couponDiscout+ 50,
                item.paymentMethod,
                item.status,
            ]);
            totalSales += item.totalAmount;
            totalDiscount += item.couponDiscout;
            totalRevenue += (item.totalAmount - item.couponDiscout+ 50);
        }

        // Draw the table
      doc.table(table, 10, doc.y, { width: 590, prepareHeader: () => doc.font('Helvetica-Bold'), prepareRow: (row, i) => doc.font('Helvetica').fontSize(10) });
    
      // Calculate the height of the table
      const tableHeight = (table.rows.length + 1) * 20;
    
      // Move the y-position to the bottom of the table
      doc.y += tableHeight + 10;
    
      // Move the y-position back to the bottom of the table for the total price area
      doc.y -= tableHeight;
    
      // Draw the total price area
      doc
        .fillColor("#444444")
        .fontSize(12)
        .text("Total Sales: ₹" + totalSales.toFixed(2), 10, doc.y + 10, { align: 'right' })
        .text("Total Discount: ₹" + totalDiscount.toFixed(2), 10, doc.y + 10, { align: 'right' })
        .text("Total Revenue: ₹" + totalRevenue.toFixed(2), 10, doc.y + 10, { align: 'right' });
    
      doc.moveDown();
    }
    
    doc.end();
    

    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Generate Excel Report
const generateExcelReport = async( req, res ) => {
    try {
        
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}

module.exports = {
    getSalesReport,
    generateReport,
    generateExcelReport
}