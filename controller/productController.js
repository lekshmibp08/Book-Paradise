const Product = require("../models/productModel")
const Category = require("../models/categoryModel")
const fs = require("fs")
const path = require("path")


//Render Add Product Page
const getProductAddPage = async (req, res) => {
    try {
        const categories = await Category.find({ isListed: true })
        res.render("addProducts", { category: categories })
    } catch (error) {
        console.log(error.message);
    }
}

//Add Product and product Details
const addProducts = async(req, res) => {
    try {
        const products = req.body;
        //console.log(req.files);
        console.log(products.productName);        
        const productExists = await Product.findOne({ productName: products.productName})
        console.log("image section tested");
        if(productExists){
            res.json({ status: "failed", message: "Product already exists" });
        } else{
            const images = []
            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    images.push(req.files[i].filename);
                }
            }
            const newProduct = new Product({
                id: Date.now(),
                productName: products.productName,
                description: products.description,
                authorTitle: products.authorTitle,
                category: products.category,
                regularPrice: products.regularPrice,
                salePrice: products.salePrice,
                authorDetails: products.authorDetails,
                quantity: products.quantity,
                language: products.language,
                productImage: images
            })
            await newProduct.save()
            console.log("product added");
            res.json({ status: "success", message: "Product added successfully" });
        }
    } catch (error) {
        console.log(error.message);
    }
}


//Render Product Page
const getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.render("products", { products })
    } catch (error) {
        console.log(error.message);
    }
}


//Render Edit Product Page
const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id
        const findProduct = await Product.findOne({ _id: id })
        const category = await Category.find({})
        res.render("editProducts", { product: findProduct, category: category })
    } catch (error) {
        console.log(error.message);
    }
}


//Edit and update Product details
const editProduct = async(req, res) => {
    try {
        const id = req.params.id;
        console.log("update product working", id);
        const data = req.body
        const images = []
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            }
        }
        if (req.files.length > 0) {
            const updatedProduct = await Product.findByIdAndUpdate(id, {
                id: Date.now(),
                productName: data.productName,
                description: data.description,
                authorTitle: data.authorTitle,
                category: data.category,
                regularPrice: data.regularPrice,
                salePrice: data.salePrice,
                authorDetails: data.authorDetails,
                quantity: data.quantity,
                language: data.language,
                productImage: images
            }, { new: true })
            console.log("product updated");
            res.status(200).json({ status: 'success', message: 'Product updated successfully.' });
        }else{
            const updatedProduct = await Product.findByIdAndUpdate(id, {
                id: Date.now(),
                productName: data.productName,
                description: data.description,
                authorTitle: data.authorTitle,
                category: data.category,
                regularPrice: data.regularPrice,
                salePrice: data.salePrice,
                authorDetails: data.authorDetails,
                quantity: data.quantity,
                language: data.language,
            }, { new: true })
            console.log("product updated");
            res.status(200).json({ status: 'success', message: 'Product updated successfully.' });
        }
        

    } catch (error) {
        console.log(error.message);
        res.status(500).json({ status: 'error', message: 'An error occurred while editing the product.' });
    }
}


//Block Product
const blockProduct = async (req, res) => {
    try {
        let id = req.query.id
        await Product.updateOne({ _id: id }, { $set: { isBlocked: true } })
        console.log("product blocked")
        res.redirect("/admin/products")
    } catch (error) {
        console.log(error.message);
    }
}


//Unblock Product
const unblockProduct = async (req, res) => {
    try {
        let id = req.query.id
        await Product.updateOne({ _id: id }, { $set: { isBlocked: false } })
        console.log("product unblocked")
        res.redirect("/admin/products")
    } catch (error) {
        console.log(error.message);
    }
}


module.exports = {
    getProductAddPage,
    getAllProducts,
    addProducts,
    getEditProduct,
    editProduct,
    blockProduct,
    unblockProduct
}