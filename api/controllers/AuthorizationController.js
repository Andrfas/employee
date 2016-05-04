var requestsDB = require('../../api/services/requestsDB.js')
var CommonFunctions = require('../../api/services/CommonFunctions.js')
var async = require('async')
var db = require('../../libs/mongoose.js');

module.exports = {
    signIn: signIn,
    signOut: signOut
}

function signIn(req, res){
	var reqFieldsPresent = CommonFunctions.areKeysInObj(reqFields.signIn, req.body);
    if(reqFieldsPresent !== true) {
        return res.json({success:false, data:{status:1, msg:reqFieldsPresent+' is missing'}})
    }

 	async.waterfall([
        function(callback) {
        	var findCriteria = {
        		email: req.body.email
        	}
   			requestsDB.findOne('Credentials', findCriteria, function(err,response){
                if (err) {
                    return res.json({success:false, data:{status:500, msg:'Error while finding credentials document'}})
                }
                if (response === null) {
                    return res.json({success:false, data:{status:1, msg:'Account with such email is not found.'}})
                }
            callback(null, response);
            })
        },
        function(credentials, callback) {

        	var dbModel = new db.Credentials(credentials)
            // console.log(credentials)
        	if (!dbModel.validPass(req.body.password)){
        		return res.json({success:false, data:{status: 1, msg:'Password is invalid.'}})
        	}
   			
            callback(null, credentials);
        },
        function(credentials, callback) {

        	generateToken(function(res){
        		var token = res;

            	callback(null, credentials, token);
        	});
        },
        function(credentials, token, callback) {

            var searchFields = {
                _id: credentials._id
            }

            var updateFields = {
                token: token,
                last_activity: new Date()
            }

            requestsDB.update('Credentials', searchFields, updateFields, function(err,response){
                if (err) {
                    return res.json({success:false, data:{status:500, msg:'Error while updating credentials document'}})
                }
                callback(credentials, token)
            })
        }
    ], function (credentials, token) {
        return res.json({
            success:true, 
            data:{
            	status: 200, 
            	token: token, 
            	client_id: credentials.client_id,
            	client_type: credentials.client_type,
                client_status: credentials.status
            }
        });
    });

}

function signOut(req, res){

    var searchFields = {
        token: req.headers['authorization']
    }

    var updateFields = {
        token: null
    }

    requestsDB.update('Credentials', searchFields, updateFields, function(err,response){
        if (err) {
            return res.json({success:false, data:{status:500, msg:'Error while updating credentials document'}})
        }
        return res.ok({success:true, data:{status:200}})
    })
}

function generateToken(callback){
	require('crypto').randomBytes(48, function(ex, buf) {
	  callback(buf.toString('hex'));
	});
}
// fields, that are required for request. Should be for each function, and should have the same name
var reqFields = {
    signIn: [
        'email',
        'password'
    ]
}