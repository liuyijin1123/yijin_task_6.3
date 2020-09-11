const mongoose = require("mongoose")
const validator = require("validator")
const userSchema = new mongoose.Schema({
    country: String,
    fname: String,
    lname: String,
    email: {type: String,
            trim:true,
            lowercase:true,
            validate(value){
                if (!validator.isEmail(value)){
                    throw new Error('Email is not valid!')
                }
            }},
    password: {type: String,
                validate(value){
                    if (value.length < 8){
                        throw new Error('Password is not valid!')
                    }
                }},
    address: String,
    city: String,
    state: String,
    zip: String,
    mobile: String
        // {type: String,
        //         validate(value){
        //             if (!validator.isMobilePhone(value)){
        //                 throw new Error('Mobile number is not valid!')
        //             }
        //         }},
})

module.exports  =  mongoose.model("User", userSchema)
