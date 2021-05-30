const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema(
	{
        firstname: { type: String, required: true },
		lastname: { type: String, required: true },
		username: { type: String, required: true, unique: true },
		hashedPassword: { type: String, required: true }
	},
	{ collection: 'users' }
)

const model = mongoose.model('UserSchema', UserSchema)

module.exports = model