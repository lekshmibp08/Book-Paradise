const User = require("../models/userModel");
const Product = require("../models/productModel");


//Render Wishlist Page
const getWishlistPage = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await User.findById(userId);
        const productIds = user.wishlist;

        const products = await Product.find({ _id: { $in: productIds } });

        res.render('wishlist', { products, user });
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
    }
}


//Add Product to Wishlist
const addToWishlist = async (req, res) => {
    try {
        const id = req.session.user;
        const productId = req.query.id;
        console.log("User : ", id);
        console.log("Product ID : ", productId);
    
        const user = await User.findById(id);
        if (user) {
            console.log("if user true");
            const alreadyAdded = user.wishlist.includes(productId);
            if (alreadyAdded) {

                let updatedUser = await User.findByIdAndUpdate(id, {
                    $pull: { wishlist: productId }
                }, { new: true });
                res.status(200).json({ message: 'Removed from wishlist', productId, added: false });
                console.log('Removed from wishlist');
    
            } else {
                let updatedUser = await User.findByIdAndUpdate(id, {
                    $push: { wishlist: productId }
                }, { new: true });
                res.status(200).json({ message: 'Added to wishlist', productId, added: true });
                console.log('Added to wishlist');
            }
        } else {
            console.log("if user false");
            res.status(404).json({ message: 'User not found'});            
        }
        
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });
        }
    };
    
    
//Remove product from Wishlist
const deleteFromWishlist = async( req, res ) =>{
    try {
        
        const userId = req.session.user;
        const productId = req.query.id;
        console.log(req.query.id);
        const updatedUser = await User.findByIdAndUpdate(userId, {
            $pull: { wishlist: productId}
        })
        console.log("Product removed");
        res.redirect('/wishlist')
            
    } catch (error) {
        console.log(error.message);
        res.status(400).render('error', { message: error.message });        
    }
}

module.exports = { 
    addToWishlist,
    getWishlistPage,
    deleteFromWishlist 
};
