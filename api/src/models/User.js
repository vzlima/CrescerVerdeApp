const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'guardian'],
    default: 'user',
  },
  plan: {
    type: String,
    enum: ['free', 'familia', 'escola'],
    default: 'free',
  },
  acceptedTerms: {
    type: Boolean,
    default: false,
  },
  acceptedTermsAt: {
    type: Date,
  },
  isMinor: {
    type: Boolean,
    default: false,
  },
  guardianEmail: {
    type: String,
    lowercase: true,
  },
  guardianOf: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  sessionTimeLimitMinutes: {
    type: Number,
    default: null,
  },
  resetPasswordToken: {
    type: String,
    select: false,
  },
  resetPasswordExpires: {
    type: Date,
    select: false,
  },
  passwordChangedAt: {
    type: Date,
    select: false,
  },
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) this.passwordChangedAt = new Date();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
