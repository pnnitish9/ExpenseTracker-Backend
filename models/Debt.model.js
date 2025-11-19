const mongoose = require('mongoose');

const debtSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    type: { 
      type: String, 
      required: true, 
      enum: ['given', 'taken'], // given = lent money to someone, taken = borrowed from someone
    },
    personName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    description: { type: String, required: true, trim: true },
    date: { type: Date, required: true, default: Date.now },
    dueDate: { type: Date },
    status: { 
      type: String, 
      required: true, 
      enum: ['pending', 'settled'],
      default: 'pending'
    },
    settledDate: { type: Date },
  },
  { timestamps: true }
);

const Debt = mongoose.model('Debt', debtSchema);

module.exports = Debt;
