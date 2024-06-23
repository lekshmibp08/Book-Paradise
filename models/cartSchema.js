const Mongoose = require("mongoose")

const cartSchema = new Mongoose.Schema({
    userId: {
        type: Mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      items: [{
        product: {
          type: Mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        name : {
          type: String,
          required: true
        },
        price: {
          type: Number,
          required: true
        },
        itemQuantity: {
          type: Number,
          required: true,
        },
      }
      ],
    
    totalPrice: {
      type: Number,
      default: 0 
    },
    
    createdOn: {
      type: Date,
      default: Date.now
    }
});

const Cart = Mongoose.model("Cart", cartSchema); 

module.exports = Cart; 